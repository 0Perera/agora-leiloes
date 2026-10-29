import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import {
  DataSource,
  EntityManager,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  QueryFailedError,
} from 'typeorm';
import { forLot } from '../audit/alias';
import { expectedSeal } from '../audit/chain';
import { LastBid, lastBid } from '../bids/last-bid';
import { Clock } from '../common/clock';
import { Env } from '../config/env.validation';
import { SettledEventDto } from '../lots/dto/settled-event.dto';
import { LotEventsService } from '../lots/lot-events.service';
import { Lot } from '../lots/lot.entity';
import { Receipt } from '../receipts/receipt.entity';
import { signReceipt } from '../receipts/receipt.signature';
import { lockWallets, walletOf } from '../wallets/wallet.lock';
import { decide, WalletMove } from './settlement.rules';

const OPEN = { cancelledAt: IsNull(), settledAt: IsNull() };

type Sale = { lot: Pick<Lot, 'id'>; last: LastBid; now: Date };

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);
  private readonly secret: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: Clock,
    private readonly events: LotEventsService,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('BID_HMAC_SECRET', { infer: true });
  }

  // Sem retorno nem erro de regra: também roda fora de HTTP (timer e seed).
  async settle(lotId: number): Promise<void> {
    const result = await this.transact(lotId).catch(ignoreDuplicate);
    // Fora da transação: evento só depois do commit, nunca de liquidação revertida.
    if (result) this.events.settled(lotId, result);
  }

  async due(now: Date): Promise<number[]> {
    const lots = await this.dataSource.getRepository(Lot).find({
      select: { id: true },
      where: { ...OPEN, endsAt: LessThanOrEqual(now) },
      order: { endsAt: 'ASC' },
    });
    return lots.map((lot) => lot.id);
  }

  async next(now: Date): Promise<Date | null> {
    const lot = await this.dataSource.getRepository(Lot).findOne({
      select: { id: true, endsAt: true },
      where: { ...OPEN, endsAt: MoreThan(now) },
      order: { endsAt: 'ASC' },
    });
    return lot?.endsAt ?? null;
  }

  private transact(lotId: number): Promise<SettledEventDto | null> {
    return this.dataSource.transaction(async (manager) => {
      const lot = await lockLot(manager, lotId);
      if (!lot) return null;
      // Lida depois do lock: é o settled_at e entra na assinatura (D-056).
      const now = this.clock.now();
      // Vencedor e valor do último lance da cadeia: ver D-042.
      const last = await lastBid(manager, lotId);
      const decision = decide({ lot, last, now });
      if (!decision.settle) return null;
      // Selo divergente é evidência de adulteração: nada se move (D-064).
      if (lot.seal !== expectedSeal(this.secret, lotId, last)) {
        this.logger.warn(`lot ${lotId} not settled: seal mismatch`);
        return null;
      }
      const result = last
        ? await this.sell(manager, { lot, last, now }, decision.moves)
        : { alias: null, amount: null };
      await manager
        .getRepository(Lot)
        .update({ id: lotId }, { settledAt: now });
      return result;
    });
  }

  private async sell(
    manager: EntityManager,
    { lot, last, now }: Sale,
    moves: WalletMove[],
  ): Promise<SettledEventDto> {
    await apply(manager, moves);
    const receipt = {
      lotId: lot.id,
      alias: forLot(this.secret, last.userId, lot.id),
      amount: last.amount,
      finalHash: last.hash,
      settledAt: now,
    };
    await manager.getRepository(Receipt).insert({
      ...receipt,
      winnerUserId: last.userId,
      token: randomBytes(32).toString('base64url'),
      signature: signReceipt(this.secret, receipt),
    });
    return { alias: receipt.alias, amount: receipt.amount };
  }
}

function lockLot(manager: EntityManager, id: number) {
  return manager.getRepository(Lot).findOne({
    select: {
      id: true,
      endsAt: true,
      cancelledAt: true,
      settledAt: true,
      currentBid: true,
      auctioneerId: true,
      seal: true,
    },
    where: { id },
    lock: { mode: 'pessimistic_write' },
  });
}

// Um UPDATE só, depois da trava em ordem de id: a variação é somada no banco.
async function apply(manager: EntityManager, moves: WalletMove[]) {
  const wallets = await lockWallets(
    manager,
    moves.map((move) => move.userId),
  );
  const rows = moves.map((move) => ({
    id: walletOf(wallets, move.userId).id,
    balance: move.balance,
    committed: move.committed,
  }));
  await manager.query(
    `UPDATE wallets w
     SET balance = w.balance + m.balance, committed = w.committed + m.committed
     FROM jsonb_to_recordset($1::jsonb) AS m(id int, balance int, committed int)
     WHERE w.id = m.id`,
    [JSON.stringify(rows)],
  );
}

// Quem perdeu a corrida no UNIQUE (lot_id) termina como quem viu settled_at (D-009).
function ignoreDuplicate(error: unknown): null {
  if (error instanceof QueryFailedError && isLotDuplicate(error.driverError)) {
    return null;
  }
  throw error;
}

function isLotDuplicate(driverError: unknown): boolean {
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'constraint' in driverError &&
    driverError.constraint === 'receipts_lot_id'
  );
}
