import { BidLot, BidState, decide } from './bid.rules';

const NOW = new Date('2026-10-26T12:00:00Z');
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const BIDDER = 1;

function at(offsetMs: number): Date {
  return new Date(NOW.getTime() + offsetMs);
}

function makeLot(override: Partial<BidLot> = {}): BidLot {
  return {
    startsAt: at(-HOUR),
    endsAt: at(HOUR),
    startingBid: 10_000,
    increment: 1_000,
    ...override,
  };
}

function makeBid(override: Partial<BidState> = {}): BidState {
  return {
    lot: makeLot(),
    last: null,
    userId: BIDDER,
    available: 1_000_000,
    amount: 10_000,
    now: NOW,
    ...override,
  };
}

describe('BidRules.decide', () => {
  describe('status do lote', () => {
    it('recusa lance antes do início', () => {
      const bid = makeBid({ lot: makeLot({ startsAt: at(MINUTE) }) });

      expect(decide(bid)).toMatchObject({
        accepted: false,
        code: 'LOT_NOT_STARTED',
      });
    });

    it('aceita lance no instante exato do início', () => {
      const bid = makeBid({ lot: makeLot({ startsAt: NOW }) });

      expect(decide(bid).accepted).toBe(true);
    });

    it('recusa lance no instante exato do fim', () => {
      const bid = makeBid({ lot: makeLot({ endsAt: NOW }) });

      expect(decide(bid)).toEqual({ accepted: false, code: 'LOT_ENDED' });
    });

    it('recusa lance depois do fim', () => {
      const bid = makeBid({ lot: makeLot({ endsAt: at(-MINUTE) }) });

      expect(decide(bid)).toEqual({ accepted: false, code: 'LOT_ENDED' });
    });

    it('a recusa por lote não iniciado informa o início', () => {
      const startsAt = at(HOUR);
      const bid = makeBid({ lot: makeLot({ startsAt, endsAt: at(2 * HOUR) }) });

      expect(decide(bid)).toEqual({
        accepted: false,
        code: 'LOT_NOT_STARTED',
        startsAt,
      });
    });
  });
});
