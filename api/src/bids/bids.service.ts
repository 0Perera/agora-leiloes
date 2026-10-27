import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { forLot } from '../audit/alias';
import { expectedSeal, GENESIS, hashBid, sealLot } from '../audit/chain';
import { Clock } from '../common/clock';
import { DomainException } from '../common/domain.exception';
import { Env } from '../config/env.validation';
import { LotEventsService } from '../lots/lot-events.service';
import { Lot } from '../lots/lot.entity';
import { Wallet } from '../wallets/wallet.entity';
import { lockWallets, walletOf } from '../wallets/wallet.lock';
import {
  BidHistoryDto,
  HistoryRow,
  toHistoryItem,
} from './dto/bid-history.dto';
import { BidResponseDto } from './dto/bid-response.dto';
import { Bid } from './bid.entity';
import { decide, Movement, Refusal } from './bid.rules';

const PAGE_SIZE = 20;

// Parte de lots para distinguir lote inexistente (nenhuma linha) de página vazia (seq nulo).
// Página de trás para frente no índice (lot_id, seq), sem depender de bid_count (D-042).
const HISTORY_SQL = `
  SELECT bid.seq, bid.user_id AS "userId", bid.amount, bid.created_at AS "createdAt",
    (SELECT COUNT(*) FROM bids WHERE lot_id = lot.id)::int AS total
  FROM lots lot LEFT JOIN LATERAL (
    SELECT seq, user_id, amount, created_at FROM bids WHERE lot_id = lot.id
    ORDER BY seq DESC LIMIT $3 OFFSET $2) bid ON true
  WHERE lot.id = $1 AND lot.cancelled_at IS NULL
  ORDER BY bid.seq DESC`;

// LEFT JOIN: lote sem lances na página volta numa linha só, com as colunas do lance nulas.
type PageRow = { [K in keyof HistoryRow]: HistoryRow[K] | null } & {
  total: number;
};

type LastBid = Pick<Bid, 'seq' | 'userId' | 'amount' | 'hash'>;

type Placement = {
  lot: Pick<Lot, 'id'>;
  last: LastBid | null;
  userId: number;
  amount: number;
  now: Date;
};

@Injectable()
export class BidsService {
  private readonly secret: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: Clock,
    private readonly events: LotEventsService,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('BID_HMAC_SECRET', { infer: true });
  }

  async place(
    userId: number,
    lotId: number,
    amount: number,
  ): Promise<BidResponseDto> {
    const bid = await this.transact(userId, lotId, amount);
    // Fora da transação: evento só depois do commit, nunca de lance revertido.
    this.events.publish(lotId, bid);
    return bid;
  }

  async history(lotId: number, page: number): Promise<BidHistoryDto> {
    const rows = await this.dataSource.query<PageRow[]>(HISTORY_SQL, [
      lotId,
      (page - 1) * PAGE_SIZE,
      PAGE_SIZE,
    ]);
    if (rows.length === 0) throw new NotFoundException();
    const alias = (userId: number) => forLot(this.secret, userId, lotId);
    return {
      items: rows
        .filter((row): row is HistoryRow & PageRow => row.seq !== null)
        .map((row) => toHistoryItem(row, alias)),
      page,
      pageSize: PAGE_SIZE,
      total: rows[0].total,
    };
  }

  // Liderança e mínimo saem do último lance de bids, nunca da cópia no lote (D-042).
  private transact(
    userId: number,
    lotId: number,
    amount: number,
  ): Promise<BidResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const lot = await lockLot(manager, lotId);
      // Lida depois do lock: lance que esperou na fila é julgado na hora em que entrou.
      const now = this.clock.now();
      const last = await lastBid(manager, lotId);
      // Sem isso, apagar lances do fim e dar um lance novo reassinaria o selo,
      // apagando a evidência da remoção (D-059).
      if (lot.seal !== expectedSeal(this.secret, lotId, last)) {
        throw new DomainException('LOT_INTEGRITY_FAILED');
      }
      const wallets = await lockWallets(manager, [userId, last?.userId]);
      const decision = decide({
        lot,
        last: last && { userId: last.userId, amount: last.amount },
        userId,
        available: available(wallets, userId),
        amount,
        now,
      });
      if (!decision.accepted) throw refused(decision);

      const placed = { lot, last, userId, amount, now };
      const bid = await this.record(manager, placed);
      await manager.getRepository(Lot).update(
        { id: lotId },
        {
          currentBid: amount,
          bidCount: bid.seq,
          endsAt: decision.endsAt,
          seal: sealLot(this.secret, {
            lotId,
            count: bid.seq,
            lastHash: bid.hash,
          }),
        },
      );
      await move(manager, wallets, decision.release, -1);
      await move(manager, wallets, decision.commit, 1);
      return {
        seq: bid.seq,
        amount,
        alias: forLot(this.secret, userId, lotId),
        createdAt: now,
        endsAt: decision.endsAt,
      };
    });
  }

  private async record(
    manager: EntityManager,
    { lot, last, userId, amount, now }: Placement,
  ): Promise<Pick<Bid, 'seq' | 'hash'>> {
    const seq = (last?.seq ?? 0) + 1;
    const prevHash = last?.hash ?? GENESIS;
    const link = {
      lotId: lot.id,
      seq,
      userId,
      amount,
      createdAt: now,
      prevHash,
    };
    const hash = hashBid(this.secret, link);
    await manager.getRepository(Bid).insert({ ...link, hash });
    return { seq, hash };
  }
}

async function lockLot(manager: EntityManager, id: number) {
  const lot = await manager.getRepository(Lot).findOne({
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      startingBid: true,
      increment: true,
      seal: true,
    },
    where: { id, cancelledAt: IsNull() },
    lock: { mode: 'pessimistic_write' },
  });
  if (!lot) throw new NotFoundException();
  return lot;
}

function lastBid(manager: EntityManager, lotId: number) {
  return manager.getRepository(Bid).findOne({
    select: { seq: true, userId: true, amount: true, hash: true },
    where: { lotId },
    order: { seq: 'DESC' },
  });
}

function available(wallets: Wallet[], userId: number): number {
  const wallet = walletOf(wallets, userId);
  return wallet.balance - wallet.committed;
}

async function move(
  manager: EntityManager,
  wallets: Wallet[],
  movement: Movement | null,
  sign: 1 | -1,
): Promise<void> {
  if (!movement) return;
  const wallet = walletOf(wallets, movement.userId);
  await manager.getRepository(Wallet).update(wallet.id, {
    committed: wallet.committed + sign * movement.amount,
  });
}

function refused(refusal: Refusal): DomainException {
  const detail: Record<string, unknown> = { ...refusal };
  delete detail.accepted;
  delete detail.code;
  return new DomainException(refusal.code, detail);
}
