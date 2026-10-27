import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '../../shared/api/client';
import type { LotDetail } from '../../shared/api/types';
import { clockOffset } from '../../shared/lib/countdown';
import { retryTurn } from './room-summary';

export type Room =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ready'; lot: LotDetail; offset: number };

// acima de ~24,8 dias o setTimeout dispara na hora; ninguém deixa a sala aberta tanto tempo
const maxDelay = 2_147_483_647;
// folga para o servidor já ver o lote no novo estado quando o GET chegar
const turnMargin = 500;
const retryDelay = 2000;

function toReady(lot: LotDetail): Room {
  return {
    status: 'ready',
    lot,
    offset: clockOffset(lot.serverTime, Date.now()),
  };
}

function failure(caught: unknown): Room {
  const missing = caught instanceof ApiError && caught.status === 404;
  return { status: missing ? 'missing' : 'error' };
}

function turnOf(room: Room): number | null {
  if (room.status !== 'ready') return null;
  if (room.lot.status === 'scheduled') return Date.parse(room.lot.startsAt);
  if (room.lot.status === 'live') return Date.parse(room.lot.endsAt);
  return null;
}

export function useRoom(id: number) {
  const [room, setRoom] = useState<Room>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.lot(id).then(
      (lot) => active && setRoom(toReady(lot)),
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

  useTurn(id, room, setRoom);

  return { room, retry };
}

// o status vem sempre da API: na virada de agendado ou ao vivo, refaz o GET sem esqueleto
function useTurn(id: number, room: Room, setRoom: (room: Room) => void) {
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
          setRoom(toReady(lot));
        },
        (caught: unknown) => {
          // lote cancelado com a página aberta; outro erro mantém a tela
          const missing = caught instanceof ApiError && caught.status === 404;
          if (active && missing) setRoom({ status: 'missing' });
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

export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}
