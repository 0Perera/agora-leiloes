import { createContext, useContext } from 'react';
import type { Wallet, WalletBalance } from '../../shared/api/types';

export type WalletState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; wallet: Wallet };

export type WalletValue = WalletState & {
  reload: () => void;
  update: (balance: WalletBalance) => void;
};

export const WalletContext = createContext<WalletValue | null>(null);

export function useWallet(): WalletValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet outside WalletProvider');
  return value;
}
