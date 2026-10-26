import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { deposit, WalletState } from './wallet.rules';
import { Wallet } from './wallet.entity';

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

  async find(userId: number): Promise<WalletState> {
    const wallet = await this.wallets.findOne({
      select: { balance: true, committed: true },
      where: { userId },
    });
    if (!wallet) throw new NotFoundException();
    return { balance: wallet.balance, committed: wallet.committed };
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
