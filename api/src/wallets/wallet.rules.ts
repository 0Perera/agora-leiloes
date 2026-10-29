import { DomainException } from '../common/domain.exception';
import { MAX_INT } from '../common/max-int';

export type WalletState = { balance: number; committed: number };

export function available(wallet: WalletState): number {
  return wallet.balance - wallet.committed;
}

export function deposit(wallet: WalletState, amount: number): WalletState {
  const balance = wallet.balance + amount;
  if (balance > MAX_INT) {
    throw new DomainException('BALANCE_LIMIT_EXCEEDED');
  }
  return { ...wallet, balance };
}
