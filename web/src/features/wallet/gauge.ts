import type { WalletBalance } from '../../shared/api/types';

export type Gauge = { free: number; held: number };

// proporção sobre o saldo total; sem saldo, a barra fica vazia
export function gaugeOf(wallet: WalletBalance): Gauge {
  if (wallet.balance <= 0) return { free: 0, held: 0 };
  const free = (wallet.available / wallet.balance) * 100;
  return { free, held: 100 - free };
}
