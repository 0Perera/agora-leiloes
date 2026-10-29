import { validate } from '../../common/validate.testing';
import { DepositDto } from './deposit.dto';

describe('DepositDto', () => {
  it.each([100, 10_000_000])('aceita %p', async (amount) => {
    expect(await validate(DepositDto, { amount })).toBeUndefined();
  });

  it.each<[unknown, string]>([
    [99, 'min'],
    [10_000_001, 'max'],
    [150.5, 'isInt'],
    ['100', 'isInt'],
  ])('recusa %p com a regra %s', async (amount, rule) => {
    expect(await validate(DepositDto, { amount })).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { amount: rule },
    });
  });
});
