import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../../shared/api/client';
import type { WalletBalance } from '../../shared/api/types';
import { WalletContext } from './use-wallet';
import type { WalletState } from './use-wallet';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.wallet().then(
      (wallet) => active && setState({ status: 'ready', wallet }),
      () => active && setState({ status: 'error' }),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  // O depósito devolve só o saldo: os lotes comprometidos continuam os da última leitura.
  const update = useCallback((balance: WalletBalance) => {
    setState((current) =>
      current.status === 'ready'
        ? { status: 'ready', wallet: { ...current.wallet, ...balance } }
        : current,
    );
  }, []);

  const value = useMemo(
    () => ({ ...state, reload, update }),
    [state, reload, update],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
