import { validate } from '../../common/validate.testing';
import { PlaceBidDto } from './place-bid.dto';

describe('PlaceBidDto', () => {
  it.each<[unknown, string]>([
    [1.5, 'isInt'],
    [2_147_483_648, 'max'],
    [undefined, 'isInt'],
    [0, 'min'],
  ])('recusa %p com a regra %s', async (amount, rule) => {
    expect(await validate(PlaceBidDto, { amount })).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { amount: rule },
    });
  });

  it('aceita valor inteiro dentro do teto', async () => {
    expect(await validate(PlaceBidDto, { amount: 100_000 })).toBeUndefined();
  });
});
