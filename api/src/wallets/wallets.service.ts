import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Bid } from '../bids/bid.entity';
import { CommittedLotDto } from './dto/committed-lot.dto';
import {
  CommittedLots,
  toWalletDetail,
  WalletDetailDto,
} from './dto/wallet-response.dto';
import { deposit, WalletState } from './wallet.rules';
import { Wallet } from './wallet.entity';

const COMMITTED_LIMIT = 20;

@Injectable()
export class WalletsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Wallet) private readonly wallets: Repository<Wallet>,
  ) {}

  // Recebe o manager do cadastro: carteira e usuário nascem na mesma transação.
  async open(manager: EntityManager, userId: number): Promise<void> {
    await manager.getRepository(Wallet).insert({ userId });
  }

  async detail(userId: number): Promise<WalletDetailDto> {
    const [wallet, committed] = await Promise.all([
      this.find(userId),
      this.committedLots(userId),
    ]);
    return toWalletDetail(wallet, committed);
  }

  async find(userId: number): Promise<WalletState> {
    const wallet = await this.wallets.findOne({
      select: { balance: true, committed: true },
      where: { userId },
    });
    if (!wallet) throw new NotFoundException();
    return { balance: wallet.balance, committed: wallet.committed };
  }

  // Comprometido é do líder: lote cujo último lance é dele, ainda não liquidado nem cancelado.
  async committedLots(userId: number): Promise<CommittedLots> {
    const rows = await this.dataSource
      .getRepository(Bid)
      .createQueryBuilder('bid')
      .innerJoin('bid.lot', 'lot')
      .select('lot.id', 'id')
      .addSelect('lot.number', 'number')
      .addSelect('lot.title', 'title')
      .addSelect('bid.amount', 'amount')
      .addSelect('lot.endsAt', 'endsAt')
      .addSelect('COUNT(*) OVER()::int', 'total')
      .where('bid.userId = :userId', { userId })
      .andWhere('lot.settledAt IS NULL')
      .andWhere('lot.cancelledAt IS NULL')
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM bids later WHERE later.lot_id = bid.lot_id AND later.seq > bid.seq)',
      )
      .orderBy('lot.endsAt', 'ASC')
      .addOrderBy('lot.id', 'ASC')
      .limit(COMMITTED_LIMIT)
      .getRawMany<{ total: number } & CommittedLotDto>();
    return {
      lots: rows.map(({ id, number, title, amount, endsAt }) => ({
        id,
        number,
        title,
        amount,
        endsAt,
      })),
      total: rows[0]?.total ?? 0,
    };
  }

  deposit(userId: number, amount: number): Promise<WalletState> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Wallet);
      const wallet = await repository.findOne({
        select: { id: true, balance: true, committed: true },
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) throw new NotFoundException();
      const next = deposit(wallet, amount);
      await repository.update(wallet.id, { balance: next.balance });
      return { balance: next.balance, committed: next.committed };
    });
  }
}
