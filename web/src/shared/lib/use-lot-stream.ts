import { useEffect, useState } from 'react';
import { api, isNotFound, openLotStream } from '../api/client';
import type { BidEvent, BidHistory, LotDetail } from '../api/types';
import { connectionAfter } from './connection';
import type { Connection, StreamSignal } from './connection';

type Handlers = {
  onBid: (bid: BidEvent) => void;
  onSync: (lot: LotDetail, history: BidHistory) => void;
  onMissing: () => void;
};

const syncRetryDelay = 3000;

// o stream só avisa: ao conectar e ao reconectar, o estado completo vem dos GETs
export function useLotStream(
  id: number,
  active: boolean,
  handlers: Handlers,
): Connection {
  const { onBid, onSync, onMissing } = handlers;
  const [connection, setConnection] = useState<Connection>('live');

  useEffect(() => {
    if (!active) return;
    let open = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const signal = (next: StreamSignal) =>
      setConnection((current) => connectionAfter(current, next));

    const sync = () => {
      clearTimeout(retry);
      Promise.all([api.lot(id), api.lotBids(id, 1)]).then(
        ([lot, history]) => {
          if (!open) return;
          onSync(lot, history);
          signal('synced');
        },
        (caught: unknown) => {
          if (!open) return;
          if (isNotFound(caught)) onMissing();
          else retry = setTimeout(sync, syncRetryDelay);
        },
      );
    };

    const check = () => {
      api.lot(id).then(
        () => {},
        (caught: unknown) => open && isNotFound(caught) && onMissing(),
      );
    };

    // o resultado do encerramento vem do GET do lote, não do payload do evento
    const close = openLotStream(id, {
      onBid,
      onSettled: sync,
      onOpen: () => {
        signal('open');
        sync();
      },
      onLost: () => {
        clearTimeout(retry);
        signal('error');
      },
      onDrop: check,
    });
    return () => {
      open = false;
      clearTimeout(retry);
      close();
      setConnection('live');
    };
  }, [id, active, onBid, onSync, onMissing]);

  return connection;
}
