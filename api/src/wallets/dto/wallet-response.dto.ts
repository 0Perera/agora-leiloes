import type { WalletState } from '../wallet.rules';
import { CommittedLotDto } from './committed-lot.dto';

export class WalletResponseDto {
  balance!: number;
  committed!: number;
  available!: number;
}

export class WalletDetailDto extends WalletResponseDto {
  lots!: CommittedLotDto[];
  lotsTotal!: number;
}

export type CommittedLots = { lots: CommittedLotDto[]; total: number };

export function toWalletResponse(wallet: WalletState): WalletResponseDto {
  return {
    balance: wallet.balance,
    committed: wallet.committed,
    available: wallet.balance - wallet.committed,
  };
}

export function toWalletDetail(
  wallet: WalletState,
  committed: CommittedLots,
): WalletDetailDto {
  return {
    ...toWalletResponse(wallet),
    lots: committed.lots,
    lotsTotal: committed.total,
  };
}
