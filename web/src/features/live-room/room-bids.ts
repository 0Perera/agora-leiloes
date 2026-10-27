import type {
  BidEvent,
  BidHistory,
  BidHistoryItem,
  LotDetail,
} from '../../shared/api/types';

export type LiveRoom = {
  lot: LotDetail;
  bids: BidHistoryItem[];
  total: number;
  extended: boolean;
};

export type Situation = 'winning' | 'outbid' | 'none';

type Pricing = Pick<LotDetail, 'currentBid' | 'startingBid' | 'increment'>;

// o maior seq conhecido manda: seq é contínuo a partir de 1, então bidCount é o último seq
export function mergeBid(room: LiveRoom, bid: BidEvent): LiveRoom {
  if (room.bids.some((item) => item.seq === bid.seq)) return room;
  const { lot } = room;
  const newest = bid.seq > lot.bidCount;
  const mine = lot.me !== undefined && lot.me.alias === bid.alias;
  return {
    lot: {
      ...lot,
      ...(newest && {
        currentBid: bid.amount,
        bidCount: bid.seq,
        endsAt: bid.endsAt,
      }),
      ...(mine && lot.me && { me: { ...lot.me, hasBid: true } }),
    },
    bids: unite(room.bids, [toItem(bid)]),
    total: Math.max(room.total, bid.seq),
    extended: newest ? later(bid.endsAt, lot.endsAt) : room.extended,
  };
}

// GET mais antigo que o último lance conhecido só acrescenta os itens que faltam
export function mergeRoom(
  room: LiveRoom,
  lot: LotDetail,
  history: Pick<BidHistory, 'items' | 'total'>,
): LiveRoom {
  const current = room.lot;
  const stale = lot.bidCount < current.bidCount;
  const next: LotDetail = stale
    ? {
        ...lot,
        currentBid: current.currentBid,
        bidCount: current.bidCount,
        endsAt: current.endsAt,
      }
    : lot;
  const hasBid = Boolean(current.me?.hasBid || lot.me?.hasBid);
  return {
    lot: next.me ? { ...next, me: { ...next.me, hasBid } } : next,
    bids: unite(room.bids, history.items),
    total: Math.max(room.total, history.total),
    extended: room.extended || later(next.endsAt, current.endsAt),
  };
}

export function situationOf(
  me: NonNullable<LotDetail['me']>,
  top: BidHistoryItem | undefined,
): Situation {
  if (top && top.alias === me.alias) return 'winning';
  if (top && me.hasBid) return 'outbid';
  return 'none';
}

// só ajuda na tela: quem decide se o lance vale é a API
export function minimumOf(lot: Pricing): number {
  return lot.currentBid === null
    ? lot.startingBid
    : lot.currentBid + lot.increment;
}

export function shortcuts(lot: Pricing): number[] {
  const minimum = minimumOf(lot);
  return [minimum, minimum + lot.increment, minimum + 2 * lot.increment];
}

function unite(
  known: BidHistoryItem[],
  incoming: BidHistoryItem[],
): BidHistoryItem[] {
  const bySeq = new Map(known.map((item) => [item.seq, item]));
  for (const item of incoming) {
    if (!bySeq.has(item.seq)) bySeq.set(item.seq, item);
  }
  return [...bySeq.values()].sort((a, b) => b.seq - a.seq);
}

function toItem(bid: BidEvent): BidHistoryItem {
  return {
    seq: bid.seq,
    alias: bid.alias,
    amount: bid.amount,
    createdAt: bid.createdAt,
  };
}

function later(next: string, previous: string): boolean {
  return Date.parse(next) > Date.parse(previous);
}
