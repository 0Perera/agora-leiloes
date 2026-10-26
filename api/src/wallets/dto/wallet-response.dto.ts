import type { WalletState } from '../wallet.rules';

export class WalletResponseDto {
  balance!: number;
  committed!: number;
  available!: number;
}

export function toWalletResponse(wallet: WalletState): WalletResponseDto {
  return {
    balance: wallet.balance,
    committed: wallet.committed,
    available: wallet.balance - wallet.committed,
  };
}
