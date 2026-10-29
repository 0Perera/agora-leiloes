import { useCallback, useEffect, useRef, useState } from 'react';
import { api, isNotFound } from '../../shared/api/client';
import type { BidEvent, BidHistory, LotDetail } from '../../shared/api/types';
import { clockOffset } from '../../shared/lib/countdown';
import { mergeBid, mergeRoom } from '../../shared/lib/live-bids';
import type { LiveRoom } from '../../shared/lib/live-bids';
import { useLotStream } from '../../shared/lib/use-lot-stream';
import { appendPage } from './room-bids';
import { retryTurn } from './room-summary';

// cancelado só chega pelo stream: o GET do lote cancelado dá 404
export type ReadyRoom = LiveRoom & {
  status: 'ready';
  offset: number;
  cancelled: boolean;
};

export type Room =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | ReadyRoom;

type SetRoom = (update: (current: Room) => Room) => void;

const noHistory = { items: [], total: 0 };

// acima de ~24,8 dias o setTimeout dispara na hora; ninguém deixa a sala aberta tanto tempo
const maxDelay = 2_147_483_647;
// folga para o servidor já ver o lote no novo estado quando o GET chegar
const turnMargin = 500;
const retryDelay = 2000;

function toReady(lot: LotDetail, history: BidHistory): Room {
  return {
    status: 'ready',
    lot,
    offset: clockOffset(lot.serverTime, Date.now()),
    bids: history.items,
    total: history.total,
    extended: false,
    cancelled: false,
  };
}

function synced(
  current: Room,
  lot: LotDetail,
  history: Pick<BidHistory, 'items' | 'total'> = noHistory,
): Room {
  if (current.status !== 'ready') return current;
  return {
    ...mergeRoom(current, lot, history),
    status: 'ready',
    offset: clockOffset(lot.serverTime, Date.now()),
    cancelled: current.cancelled,
  };
}

function withBid(current: Room, bid: BidEvent): Room {
  if (current.status !== 'ready') return current;
  return { ...current, ...mergeBid(current, bid) };
}

function failure(caught: unknown): Room {
  return { status: isNotFound(caught) ? 'missing' : 'error' };
}

function turnOf(room: Room): number | null {
  if (room.status !== 'ready' || room.cancelled) return null;
  if (room.lot.status === 'scheduled') return Date.parse(room.lot.startsAt);
  if (room.lot.status === 'live') return Date.parse(room.lot.endsAt);
  return null;
}

export function useRoom(id: number) {
  const [room, setRoom] = useState<Room>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([api.lot(id), api.lotBids(id, 1)]).then(
      ([lot, history]) => active && setRoom(toReady(lot, history)),
      (caught: unknown) => active && setRoom(failure(caught)),
    );
    return () => {
      active = false;
    };
  }, [id, attempt]);

  const retry = useCallback(() => {
    setRoom({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  const placed = useCallback(
    (bid: BidEvent) => setRoom((current) => withBid(current, bid)),
    [],
  );
  const sync = useCallback(
    (lot: LotDetail, history: BidHistory) =>
      setRoom((current) => synced(current, lot, history)),
    [],
  );
  const missing = useCallback(() => setRoom({ status: 'missing' }), []);
  const cancelled = useCallback(
    () =>
      setRoom((current) =>
        current.status === 'ready' ? { ...current, cancelled: true } : current,
      ),
    [],
  );
  const older = useCallback(
    (page: number) =>
      api
        .lotBids(id, page)
        .then((history) =>
          setRoom((current) =>
            current.status === 'ready'
              ? { ...current, ...appendPage(current, history) }
              : current,
          ),
        ),
    [id],
  );

  useTurn(id, room, setRoom);
  const streaming =
    room.status === 'ready' && room.lot.status !== 'ended' && !room.cancelled;
  const connection = useLotStream(id, streaming, {
    onBid: placed,
    onSync: sync,
    onMissing: missing,
    onCancelled: cancelled,
  });

  return { room, connection, retry, placed, missing, older };
}

// o status vem sempre da API: na virada de agendado ou ao vivo, refaz o GET sem esqueleto
function useTurn(id: number, room: Room, setRoom: SetRoom) {
  const turn = turnOf(room);
  const status = room.status === 'ready' ? room.lot.status : null;
  const offset = room.status === 'ready' ? room.offset : 0;
  const fetched = useRef<number | null>(null);

  useEffect(() => {
    if (turn === null || status === null || fetched.current === turn) return;
    const delay = turn - (Date.now() + offset) + turnMargin;
    if (delay > maxDelay) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const check = (retries: number) => {
      api.lot(id).then(
        (lot) => {
          if (!active) return;
          if (retryTurn(status, lot.status, retries)) {
            timer = setTimeout(() => check(retries + 1), retryDelay);
            return;
          }
          setRoom((current) => synced(current, lot));
        },
        (caught: unknown) => {
          // lote cancelado com a página aberta; outro erro mantém a tela
          if (active && isNotFound(caught))
            setRoom(() => ({ status: 'missing' }));
        },
      );
    };

    timer = setTimeout(
      () => {
        fetched.current = turn;
        check(0);
      },
      Math.max(0, delay),
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, turn, status, offset, setRoom]);
}
