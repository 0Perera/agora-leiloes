import { useCallback, useEffect, useState } from 'react';
import { api, isNotFound } from '../../shared/api/client';
import type { BidEvent, BidHistory, LotDetail } from '../../shared/api/types';
import { clockOffset } from '../../shared/lib/countdown';
import { mergeBid, mergeRoom } from '../../shared/lib/live-bids';
import type { LiveRoom } from '../../shared/lib/live-bids';
import { useLotStream } from '../../shared/lib/use-lot-stream';
import { useOptionalWallet } from '../../shared/lib/use-wallet';

export type ReadyFeatured = LiveRoom & { status: 'ready'; offset: number };

export type Featured =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'none' }
  | ReadyFeatured;

async function loadFeatured(): Promise<Featured> {
  const card = await api.featured();
  if (!card) return { status: 'none' };
  try {
    const [lot, history] = await Promise.all([
      api.lot(card.id),
      api.lotBids(card.id, 1),
    ]);
    if (lot.status === 'ended') return { status: 'none' };
    return {
      status: 'ready',
      lot,
      bids: history.items,
      total: history.total,
      extended: false,
      offset: clockOffset(lot.serverTime, Date.now()),
    };
  } catch (caught) {
    // o lote pode ter sido cancelado entre as duas chamadas
    if (isNotFound(caught)) return { status: 'none' };
    throw caught;
  }
}

function withBid(current: Featured, bid: BidEvent): Featured {
  if (current.status !== 'ready') return current;
  return { ...current, ...mergeBid(current, bid) };
}

// o status fica o do carregamento: a virada com a página aberta só aparece ao recarregar
function synced(
  current: Featured,
  lot: LotDetail,
  history: BidHistory,
): Featured {
  if (current.status !== 'ready') return current;
  const merged = mergeRoom(current, lot, history);
  return {
    ...merged,
    lot: { ...merged.lot, status: current.lot.status },
    status: 'ready',
    offset: clockOffset(lot.serverTime, Date.now()),
  };
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

  const onBid = useCallback(
    (bid: BidEvent) => setFeatured((current) => withBid(current, bid)),
    [],
  );
  const onSync = useCallback(
    (lot: LotDetail, history: BidHistory) =>
      setFeatured((current) => synced(current, lot, history)),
    [],
  );
  const onMissing = useCallback(() => setFeatured({ status: 'none' }), []);
  const refresh = useOptionalWallet()?.refresh;
  const onCancelled = useCallback(() => {
    refresh?.();
    onMissing();
  }, [refresh, onMissing]);

  const id = featured.status === 'ready' ? featured.lot.id : 0;
  useLotStream(id, featured.status === 'ready', {
    onBid,
    onSync,
    onMissing,
    onCancelled,
  });

  return { featured, retry };
}
