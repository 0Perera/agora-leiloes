import { useEffect, useRef } from 'react';
import type { Situation } from '../../shared/lib/live-bids';
import { useWallet } from './use-wallet';

// a situação muda o comprometido: relê a carteira sem piscar o resumo do cabeçalho
export function useWalletRefresh(situation: Situation) {
  const { refresh } = useWallet();
  const previous = useRef(situation);

  useEffect(() => {
    if (previous.current === situation) return;
    previous.current = situation;
    refresh();
  }, [situation, refresh]);
}
