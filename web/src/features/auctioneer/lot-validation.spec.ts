import { describe, expect, it } from 'vitest';
import { lotMessages, validateLot } from './lot-validation';
import type { LotForm } from './lot-validation';

const now = new Date(2026, 9, 24, 12, 0);

function makeForm(override: Partial<LotForm> = {}): LotForm {
  return {
    startingBid: '1.500,00',
    increment: '50,00',
    startsAt: '2026-10-24T19:00',
    endsAt: '2026-10-24T21:00',
    ...override,
  };
}

describe('validateLot', () => {
  it('recusa lance inicial vazio', () => {
    expect(validateLot(makeForm({ startingBid: '' }), now)).toEqual({
      errors: { startingBid: lotMessages.startingBidEmpty },
    });
  });

  it('recusa lance inicial acima do teto', () => {
    expect(
      validateLot(makeForm({ startingBid: '10.000.000,01' }), now),
    ).toEqual({ errors: { startingBid: lotMessages.startingBidMax } });
  });

  it('recusa início mais de 1 min no passado', () => {
    expect(
      validateLot(makeForm({ startsAt: '2026-10-24T11:58' }), now),
    ).toEqual({ errors: { startsAt: lotMessages.startsAtPast } });
  });

  it.each(['2026-10-24T19:00', '2026-10-24T18:00'])(
    'recusa fim em %s, antes ou igual ao início',
    (endsAt) => {
      expect(validateLot(makeForm({ endsAt }), now)).toEqual({
        errors: { endsAt: lotMessages.endsAtAfterStart },
      });
    },
  );

  it('devolve centavos e ISO para ficha válida', () => {
    expect(validateLot(makeForm(), now)).toEqual({
      conditions: {
        startingBid: 150000,
        increment: 5000,
        startsAt: new Date(2026, 9, 24, 19, 0).toISOString(),
        endsAt: new Date(2026, 9, 24, 21, 0).toISOString(),
      },
    });
  });
});
