import { useEffect } from 'react';
import { ApiError, api, openLotStream } from '../../shared/api/client';
import type { BidEvent, BidHistory, LotDetail } from '../../shared/api/types';

type Handlers = {
  onBid: (bid: BidEvent) => void;
  onSync: (lot: LotDetail, history: BidHistory) => void;
  onMissing: () => void;
};

// o stream só avisa: ao conectar e ao reconectar, o estado completo vem dos GETs
export function useStream(id: number, active: boolean, handlers: Handlers) {
  const { onBid, onSync, onMissing } = handlers;

  useEffect(() => {
    if (!active) return;
    let open = true;

    const onOpen = () => {
      Promise.all([api.lot(id), api.lotBids(id, 1)]).then(
        ([lot, history]) => open && onSync(lot, history),
        (caught: unknown) => {
          const missing = caught instanceof ApiError && caught.status === 404;
          if (open && missing) onMissing();
        },
      );
    };

    const close = openLotStream(id, { onBid, onOpen, onDrop: onOpen });
    return () => {
      open = false;
      close();
    };
  }, [id, active, onBid, onSync, onMissing]);
}
