import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../../shared/api/client';
import type { LotDetail } from '../../shared/api/types';
import { clockOffset } from '../../shared/lib/countdown';

export type Featured =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'none' }
  | { status: 'ready'; lot: LotDetail; offset: number };

async function loadFeatured(): Promise<Featured> {
  const card = await api.featured();
  if (!card) return { status: 'none' };
  try {
    const lot = await api.lot(card.id);
    if (lot.status === 'ended') return { status: 'none' };
    return {
      status: 'ready',
      lot,
      offset: clockOffset(lot.serverTime, Date.now()),
    };
  } catch (caught) {
    // o lote pode ter sido cancelado entre as duas chamadas
    if (caught instanceof ApiError && caught.status === 404) {
      return { status: 'none' };
    }
    throw caught;
  }
}

// buscado uma vez: o destaque não troca de lote enquanto o visitante está na página
export function useFeatured() {
  const [featured, setFeatured] = useState<Featured>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadFeatured().then(
      (result) => active && setFeatured(result),
      () => active && setFeatured({ status: 'error' }),
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setFeatured({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  return { featured, retry };
}
