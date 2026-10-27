import {
  decide,
  SettlementDecision,
  SettlementLot,
  SettlementState,
} from './settlement.rules';

const NOW = new Date('2026-10-27T12:00:00Z');
const MINUTE = 60 * 1000;
const AUCTIONEER = 1;
const WINNER = 2;

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

function closeOf(decision: SettlementDecision) {
  if (!decision.settle) throw new Error(decision.reason);
  return decision;
}

function moveOf(decision: SettlementDecision, userId: number) {
  return closeOf(decision).moves.find((move) => move.userId === userId);
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

  describe('resultado', () => {
    it('fecha sem vencedor quando não há lances', () => {
      expect(closeOf(decide(makeState())).winner).toBeNull();
    });

    it('não move saldo quando não há lances', () => {
      expect(closeOf(decide(makeState())).moves).toEqual([]);
    });

    it('o vencedor é o autor do último lance', () => {
      const state = makeState({ last: { userId: WINNER, amount: 15_000 } });

      expect(closeOf(decide(state)).winner?.userId).toBe(WINNER);
    });

    it('o valor vem do último lance, não do lance atual do lote', () => {
      const state = makeState({
        lot: makeLot({ currentBid: 99_000 }),
        last: { userId: WINNER, amount: 15_000 },
      });

      expect(closeOf(decide(state)).winner?.amount).toBe(15_000);
    });
  });

  describe('movimentos', () => {
    const last = { userId: WINNER, amount: 15_000 };

    it('debita o valor do saldo do vencedor', () => {
      expect(moveOf(decide(makeState({ last })), WINNER)?.balance).toBe(
        -15_000,
      );
    });

    it('libera o valor do comprometido do vencedor', () => {
      expect(moveOf(decide(makeState({ last })), WINNER)?.committed).toBe(
        -15_000,
      );
    });

    it('credita o valor no saldo do leiloeiro', () => {
      expect(moveOf(decide(makeState({ last })), AUCTIONEER)).toEqual({
        userId: AUCTIONEER,
        balance: 15_000,
        committed: 0,
      });
    });

    it('o comprometido do vencedor varia só pelo valor deste lote', () => {
      const decision = decide(makeState({ last }));

      expect(moveOf(decision, WINNER)).toEqual({
        userId: WINNER,
        balance: -15_000,
        committed: -15_000,
      });
    });
  });
});
