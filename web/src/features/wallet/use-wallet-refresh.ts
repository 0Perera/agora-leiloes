import { useEffect, useRef } from 'react';
import { useWallet } from './use-wallet';

// a situação muda o saldo ou o comprometido: relê a carteira sem piscar o resumo do cabeçalho
export function useWalletRefresh(key: string) {
  const { refresh } = useWallet();
  const previous = useRef(key);

  useEffect(() => {
    if (previous.current === key) return;
    previous.current = key;
    refresh();
  }, [key, refresh]);
}
