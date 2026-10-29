import type { BidHistory } from '../../shared/api/types';
import { minimumOf, unite } from '../../shared/lib/live-bids';
import type { LiveRoom, Pricing } from '../../shared/lib/live-bids';
import { maxPage } from '../../shared/lib/limits';

const pageSize = 20;

// o seq é contínuo a partir de 1: enquanto o menor carregado passa de 1, há lances anteriores;
// a página parte do lance mais novo conhecido; a sobreposição com o que já está na tela some no unite
export function olderPage(room: Pick<LiveRoom, 'lot' | 'bids'>): number | null {
  const oldest = room.bids.at(-1);
  if (!oldest || oldest.seq <= 1) return null;
  const newer = room.lot.bidCount - (oldest.seq - 1);
  const page = Math.floor(newer / pageSize) + 1;
  return page <= maxPage ? page : null;
}

export function appendPage(
  room: LiveRoom,
  history: Pick<BidHistory, 'items' | 'total'>,
): LiveRoom {
  return {
    ...room,
    bids: unite(room.bids, history.items),
    total: Math.max(room.total, history.total),
  };
}

export function shortcuts(lot: Pricing): number[] {
  const minimum = minimumOf(lot);
  return [minimum, minimum + lot.increment, minimum + 2 * lot.increment];
}
