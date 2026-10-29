import type { BidHistoryItem, LotDetail } from '../api/types';

export const endsAt = '2026-10-27T22:00:00.000Z';

export function makeLot(override: Partial<LotDetail> = {}): LotDetail {
  return {
    id: 1,
    number: 7,
    artworkId: 10,
    accessionNumber: '1950.1',
    title: 'Retrato',
    artist: 'Rembrandt',
    date: '1632',
    type: 'Painting',
    technique: 'óleo sobre tela',
    measurements: '100 x 80 cm',
    description: null,
    department: 'European Painting and Sculpture',
    startingBid: 800_000,
    increment: 50_000,
    startsAt: '2026-10-27T10:00:00.000Z',
    endsAt,
    status: 'live',
    currentBid: 850_000,
    bidCount: 2,
    serverTime: '2026-10-27T20:00:00.000Z',
    result: null,
    me: { alias: 'Licitante AAAAAA', hasBid: false },
    ...override,
  };
}

export function makeItem(
  override: Partial<BidHistoryItem> = {},
): BidHistoryItem {
  return {
    seq: 2,
    alias: 'Licitante BBBBBB',
    amount: 850_000,
    createdAt: '2026-10-27T19:00:00.000Z',
    ...override,
  };
}
