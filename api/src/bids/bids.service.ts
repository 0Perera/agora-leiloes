import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { forLot } from '../audit/alias';
import { GENESIS, hashBid, sealLot } from '../audit/chain';
import { Clock } from '../common/clock';
import { DomainException } from '../common/domain.exception';
import { Env } from '../config/env.validation';
import { Lot } from '../lots/lot.entity';
import { Wallet } from '../wallets/wallet.entity';
import { BidResponseDto } from './dto/bid-response.dto';
import { Bid } from './bid.entity';
import { decide, Movement, Refusal } from './bid.rules';

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
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('BID_HMAC_SECRET', { infer: true });
  }

  // Liderança e mínimo saem do último lance de bids, nunca da cópia no lote (D-042).
  place(
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
      if (lot.seal !== this.seal(lotId, last)) {
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

  private seal(lotId: number, last: LastBid | null): string {
    return sealLot(this.secret, {
      lotId,
      count: last?.seq ?? 0,
      lastHash: last?.hash ?? null,
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

// Uma query com ORDER BY id: o Postgres trava as linhas nessa ordem, sem deadlock.
function lockWallets(
  manager: EntityManager,
  userIds: (number | undefined)[],
): Promise<Wallet[]> {
  const ids = [...new Set(userIds)].filter((id) => id !== undefined);
  return manager.getRepository(Wallet).find({
    select: { id: true, userId: true, balance: true, committed: true },
    where: { userId: In(ids) },
    order: { id: 'ASC' },
    lock: { mode: 'pessimistic_write' },
  });
}

function walletOf(wallets: Wallet[], userId: number): Wallet {
  const wallet = wallets.find((candidate) => candidate.userId === userId);
  if (!wallet) throw new Error('wallet missing');
  return wallet;
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
