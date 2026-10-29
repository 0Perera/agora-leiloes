import { createContext, useContext } from 'react';
import type { Wallet, WalletBalance } from '../api/types';

export type WalletState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; wallet: Wallet };

export type WalletValue = WalletState & {
  reload: () => void;
  refresh: () => void;
  update: (balance: WalletBalance) => void;
};

export const WalletContext = createContext<WalletValue | null>(null);

export function useWallet(): WalletValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet outside WalletProvider');
  return value;
}

// visitante e leiloeiro não têm carteira: quem pode rodar para todos relê só se houver
export function useOptionalWallet(): WalletValue | null {
  return useContext(WalletContext);
}
