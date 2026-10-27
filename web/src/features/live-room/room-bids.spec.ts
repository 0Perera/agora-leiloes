import { describe, expect, it } from 'vitest';
import type {
  BidEvent,
  BidHistoryItem,
  LotDetail,
} from '../../shared/api/types';
import type { LiveRoom } from './room-bids';
import { mergeBid, mergeRoom, shortcuts, situationOf } from './room-bids';

const endsAt = '2026-10-27T22:00:00.000Z';
const extendedEnd = '2026-10-27T22:02:00.000Z';

function makeLot(override: Partial<LotDetail> = {}): LotDetail {
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
    me: { alias: 'Licitante AAAAAA', hasBid: false },
    ...override,
  };
}

function makeItem(override: Partial<BidHistoryItem> = {}): BidHistoryItem {
  return {
    seq: 2,
    alias: 'Licitante BBBBBB',
    amount: 850_000,
    createdAt: '2026-10-27T19:00:00.000Z',
    ...override,
  };
}

function makeBid(override: Partial<BidEvent> = {}): BidEvent {
  return {
    seq: 3,
    alias: 'Licitante BBBBBB',
    amount: 900_000,
    createdAt: '2026-10-27T20:00:00.000Z',
    endsAt,
    ...override,
  };
}

function makeRoom(override: Partial<LiveRoom> = {}): LiveRoom {
  return {
    lot: makeLot(),
    bids: [makeItem(), makeItem({ seq: 1, amount: 800_000 })],
    total: 2,
    extended: false,
    ...override,
  };
}

describe('mergeBid', () => {
  it('ignora lance com seq já presente', () => {
    const room = makeRoom();

    expect(mergeBid(room, makeBid({ seq: 2 }))).toBe(room);
  });

  it('coloca o lance novo no topo do histórico', () => {
    const merged = mergeBid(makeRoom(), makeBid());

    expect(merged.bids.map((item) => item.seq)).toEqual([3, 2, 1]);
  });

  it('atualiza o lance atual com o lance novo', () => {
    expect(mergeBid(makeRoom(), makeBid()).lot.currentBid).toBe(900_000);
  });

  it('atualiza o número de lances com o lance novo', () => {
    expect(mergeBid(makeRoom(), makeBid()).lot.bidCount).toBe(3);
  });

  it('atualiza o fim do lote com o lance novo', () => {
    const merged = mergeBid(makeRoom(), makeBid({ endsAt: extendedEnd }));

    expect(merged.lot.endsAt).toBe(extendedEnd);
  });

  it('marca prorrogado quando o fim cresce', () => {
    const merged = mergeBid(makeRoom(), makeBid({ endsAt: extendedEnd }));

    expect(merged.extended).toBe(true);
  });

  it('não muda o lance atual com lance de seq menor que o atual', () => {
    const room = makeRoom({ bids: [makeItem()] });

    const merged = mergeBid(room, makeBid({ seq: 1, amount: 800_000 }));

    expect(merged.lot.currentBid).toBe(850_000);
  });

  it('não muda o fim do lote com lance de seq menor que o atual', () => {
    const room = makeRoom({ bids: [makeItem()] });

    const merged = mergeBid(
      room,
      makeBid({ seq: 1, amount: 800_000, endsAt: extendedEnd }),
    );

    expect(merged.lot.endsAt).toBe(endsAt);
  });
});

describe('mergeRoom', () => {
  it('une as listas pelo seq', () => {
    const room = makeRoom({ bids: [makeItem({ seq: 3 }), makeItem()] });
    const history = {
      items: [makeItem(), makeItem({ seq: 1 })],
      total: 2,
    };

    const merged = mergeRoom(room, makeLot(), history);

    expect(merged.bids.map((item) => item.seq)).toEqual([3, 2, 1]);
  });

  it('não volta o lance atual quando o GET é mais antigo que o último lance', () => {
    const room = mergeBid(makeRoom(), makeBid());

    const merged = mergeRoom(room, makeLot(), { items: [], total: 2 });

    expect(merged.lot.currentBid).toBe(900_000);
  });

  it('não volta o fim do lote quando o GET é mais antigo que o último lance', () => {
    const room = mergeBid(makeRoom(), makeBid({ endsAt: extendedEnd }));

    const merged = mergeRoom(room, makeLot(), { items: [], total: 2 });

    expect(merged.lot.endsAt).toBe(extendedEnd);
  });
});

describe('situationOf', () => {
  const me = { alias: 'Licitante AAAAAA', hasBid: true };

  it('está ganhando quando o maior seq é do licitante', () => {
    const top = makeItem({ alias: me.alias });

    expect(situationOf(me, top)).toBe('winning');
  });

  it('foi superado quando deu lance e o maior seq é de outro', () => {
    expect(situationOf(me, makeItem())).toBe('outbid');
  });

  it('ainda não deu lance quando não tem lance no lote', () => {
    expect(situationOf({ ...me, hasBid: false }, makeItem())).toBe('none');
  });
});

describe('shortcuts', () => {
  it('começa no lance inicial quando o lote não tem lances', () => {
    const lot = makeLot({ currentBid: null, bidCount: 0 });

    expect(shortcuts(lot)[0]).toBe(800_000);
  });

  it('começa no lance atual mais o incremento quando o lote tem lances', () => {
    expect(shortcuts(makeLot())[0]).toBe(900_000);
  });

  it('soma um e dois incrementos ao mínimo', () => {
    expect(shortcuts(makeLot()).slice(1)).toEqual([950_000, 1_000_000]);
  });
});
