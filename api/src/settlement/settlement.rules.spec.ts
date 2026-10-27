import { decide, SettlementLot, SettlementState } from './settlement.rules';

const NOW = new Date('2026-10-27T12:00:00Z');
const MINUTE = 60 * 1000;
const AUCTIONEER = 1;

function at(offsetMs: number): Date {
  return new Date(NOW.getTime() + offsetMs);
}

function makeLot(override: Partial<SettlementLot> = {}): SettlementLot {
  return {
    endsAt: at(-MINUTE),
    cancelledAt: null,
    settledAt: null,
    currentBid: null,
    auctioneerId: AUCTIONEER,
    ...override,
  };
}

function makeState(override: Partial<SettlementState> = {}): SettlementState {
  return {
    lot: makeLot(),
    last: null,
    now: NOW,
    ...override,
  };
}

describe('decide', () => {
  describe('quando liquidar', () => {
    it('não liquida um milissegundo antes do fim', () => {
      const state = makeState({ lot: makeLot({ endsAt: at(1) }) });

      expect(decide(state)).toEqual({ settle: false, reason: 'NOT_ENDED' });
    });

    it('liquida no instante exato do fim', () => {
      const state = makeState({ lot: makeLot({ endsAt: NOW }) });

      expect(decide(state).settle).toBe(true);
    });

    it('liquida pelo fim prorrogado recebido', () => {
      const lot = makeLot({ endsAt: at(2 * MINUTE) });

      expect(decide(makeState({ lot })).settle).toBe(false);
      expect(decide(makeState({ lot, now: at(2 * MINUTE) })).settle).toBe(true);
    });

    it('não liquida lote já liquidado', () => {
      const state = makeState({
        lot: makeLot({ endsAt: at(MINUTE), settledAt: at(-MINUTE) }),
      });

      expect(decide(state)).toEqual({
        settle: false,
        reason: 'ALREADY_SETTLED',
      });
    });

    it('não liquida lote cancelado', () => {
      const state = makeState({
        lot: makeLot({ endsAt: at(MINUTE), cancelledAt: at(-MINUTE) }),
      });

      expect(decide(state)).toEqual({ settle: false, reason: 'CANCELLED' });
    });

    it('lote cancelado e vencido não liquida por cancelamento', () => {
      const state = makeState({
        lot: makeLot({ cancelledAt: at(-2 * MINUTE) }),
      });

      expect(decide(state)).toEqual({ settle: false, reason: 'CANCELLED' });
    });

    it('lote já liquidado e vencido não liquida por já estar liquidado', () => {
      const state = makeState({ lot: makeLot({ settledAt: at(-MINUTE) }) });

      expect(decide(state)).toEqual({
        settle: false,
        reason: 'ALREADY_SETTLED',
      });
    });
  });
});
