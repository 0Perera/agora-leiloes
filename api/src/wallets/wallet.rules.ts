import { DomainException } from '../common/domain.exception';

// Teto da coluna integer do Postgres; bigint voltaria como string do driver.
export const MAX_BALANCE = 2_147_483_647;

export type WalletState = { balance: number; committed: number };

export function deposit(wallet: WalletState, amount: number): WalletState {
  const balance = wallet.balance + amount;
  if (balance > MAX_BALANCE) {
    throw new DomainException('BALANCE_LIMIT_EXCEEDED');
  }
  return { ...wallet, balance };
}
