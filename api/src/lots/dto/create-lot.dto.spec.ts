import { validate } from '../../common/validate.testing';
import { CreateLotDto } from './create-lot.dto';

function makeBody(override: Record<string, unknown> = {}): unknown {
  return {
    artworkId: 135382,
    startingBid: 100_000,
    increment: 5_000,
    startsAt: '2026-11-01T12:00:00Z',
    endsAt: '2026-11-02T12:00:00Z',
    ...override,
  };
}

describe('CreateLotDto', () => {
  it('recusa startingBid zero', async () => {
    expect(await validate(CreateLotDto, makeBody({ startingBid: 0 }))).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { startingBid: 'min' },
    });
  });

  it('recusa valor acima do teto', async () => {
    expect(
      await validate(CreateLotDto, makeBody({ startingBid: 1_000_000_001 })),
    ).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { startingBid: 'max' },
    });
  });
});
