import { EntityManager, In } from 'typeorm';
import { Wallet } from './wallet.entity';

// Uma query com ORDER BY id: o Postgres trava as linhas nessa ordem, sem deadlock.
export function lockWallets(
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

export function walletOf(wallets: Wallet[], userId: number): Wallet {
  const wallet = wallets.find((candidate) => candidate.userId === userId);
  if (!wallet) throw new Error('wallet missing');
  return wallet;
}
