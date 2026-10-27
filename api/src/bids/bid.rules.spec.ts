import { BidLot, BidState, decide } from './bid.rules';

const NOW = new Date('2026-10-26T12:00:00Z');
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const BIDDER = 1;
const RIVAL = 2;

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

  describe('líder', () => {
    it('recusa lance de quem já lidera', () => {
      const bid = makeBid({
        last: { userId: BIDDER, amount: 10_000 },
        amount: 11_000,
      });

      expect(decide(bid)).toEqual({ accepted: false, code: 'ALREADY_WINNING' });
    });

    it('aceita lance de quem foi superado', () => {
      const bid = makeBid({
        last: { userId: RIVAL, amount: 10_000 },
        amount: 11_000,
      });

      expect(decide(bid).accepted).toBe(true);
    });

    it('recusa por liderança antes de checar o valor', () => {
      const bid = makeBid({
        last: { userId: BIDDER, amount: 10_000 },
        amount: 10_500,
      });

      expect(decide(bid)).toEqual({ accepted: false, code: 'ALREADY_WINNING' });
    });
  });

  describe('valor', () => {
    it('aceita primeiro lance igual ao lance inicial', () => {
      const bid = makeBid({ amount: 10_000 });

      expect(decide(bid).accepted).toBe(true);
    });

    it('recusa primeiro lance abaixo do lance inicial', () => {
      const bid = makeBid({ amount: 9_999 });

      expect(decide(bid)).toMatchObject({
        accepted: false,
        code: 'BID_BELOW_MINIMUM',
      });
    });

    it('aceita lance seguinte igual ao atual mais o incremento', () => {
      const bid = makeBid({
        last: { userId: RIVAL, amount: 10_000 },
        amount: 11_000,
      });

      expect(decide(bid).accepted).toBe(true);
    });

    it('recusa lance seguinte abaixo do atual mais o incremento', () => {
      const bid = makeBid({
        last: { userId: RIVAL, amount: 10_000 },
        amount: 10_999,
      });

      expect(decide(bid)).toMatchObject({
        accepted: false,
        code: 'BID_BELOW_MINIMUM',
      });
    });

    it('informa o mínimo aceito na recusa por valor', () => {
      const bid = makeBid({
        last: { userId: RIVAL, amount: 10_000 },
        amount: 10_500,
      });

      expect(decide(bid)).toEqual({
        accepted: false,
        code: 'BID_BELOW_MINIMUM',
        minimum: 11_000,
      });
    });
  });

  describe('saldo', () => {
    it('recusa lance acima do disponível', () => {
      const bid = makeBid({ available: 9_999, amount: 10_000 });

      expect(decide(bid)).toMatchObject({
        accepted: false,
        code: 'INSUFFICIENT_BALANCE',
      });
    });

    it('aceita lance igual ao disponível', () => {
      const bid = makeBid({ available: 10_000, amount: 10_000 });

      expect(decide(bid).accepted).toBe(true);
    });

    it('recusa por status antes de checar o saldo', () => {
      const bid = makeBid({
        lot: makeLot({ endsAt: at(-MINUTE) }),
        available: 0,
      });

      expect(decide(bid)).toEqual({ accepted: false, code: 'LOT_ENDED' });
    });

    it('recusa por valor antes de checar o saldo', () => {
      const bid = makeBid({ available: 0, amount: 9_000 });

      expect(decide(bid)).toEqual({
        accepted: false,
        code: 'BID_BELOW_MINIMUM',
        minimum: 10_000,
      });
    });

    it('a recusa por saldo informa o disponível', () => {
      const bid = makeBid({ available: 5_000, amount: 10_000 });

      expect(decide(bid)).toEqual({
        accepted: false,
        code: 'INSUFFICIENT_BALANCE',
        available: 5_000,
      });
    });
  });
});
