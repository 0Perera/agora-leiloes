import { describe, expect, it } from 'vitest';
import type { BidHistoryItem } from '../../shared/api/types';
import type { LiveRoom } from '../../shared/lib/live-bids';
import { makeItem, makeLot } from '../../shared/lib/test-factories';
import { appendPage, olderPage, shortcuts } from './room-bids';

function makeRoom(override: Partial<LiveRoom> = {}): LiveRoom {
  return {
    lot: makeLot(),
    bids: [makeItem(), makeItem({ seq: 1, amount: 800_000 })],
    total: 2,
    extended: false,
    ...override,
  };
}

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

function itemsFrom(newest: number, count: number): BidHistoryItem[] {
  return Array.from({ length: count }, (_, index) =>
    makeItem({ seq: newest - index }),
  );
}

describe('olderPage', () => {
  it('pede a página 2 quando a primeira página está carregada', () => {
    const room = makeRoom({
      lot: makeLot({ bidCount: 25 }),
      bids: itemsFrom(25, 20),
    });

    expect(olderPage(room)).toBe(2);
  });

  it('conta os lances novos do stream ao escolher a página seguinte', () => {
    const room = makeRoom({
      lot: makeLot({ bidCount: 45 }),
      bids: itemsFrom(45, 40),
    });

    expect(olderPage(room)).toBe(3);
  });

  it('não pede página quando o lance 1 já está na lista', () => {
    const room = makeRoom({ bids: itemsFrom(2, 2) });

    expect(olderPage(room)).toBeNull();
  });
});

describe('appendPage', () => {
  it('acrescenta os lances anteriores embaixo sem duplicar os que vieram do stream', () => {
    const room = makeRoom({
      lot: makeLot({ bidCount: 28 }),
      bids: itemsFrom(28, 23),
      total: 28,
    });

    const merged = appendPage(room, { items: itemsFrom(8, 8), total: 28 });

    expect(merged.bids.map((bid) => bid.seq)).toEqual(
      Array.from({ length: 28 }, (_, index) => 28 - index),
    );
  });
});
