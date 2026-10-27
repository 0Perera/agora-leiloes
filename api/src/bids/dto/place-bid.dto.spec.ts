import { BadRequestException } from '@nestjs/common';
import { validationPipe } from '../../common/validation.pipe';
import { PlaceBidDto } from './place-bid.dto';

async function validate(body: unknown): Promise<unknown> {
  try {
    await validationPipe().transform(body, {
      type: 'body',
      metatype: PlaceBidDto,
    });
  } catch (error) {
    if (error instanceof BadRequestException) return error.getResponse();
    throw error;
  }
  return undefined;
}

describe('PlaceBidDto', () => {
  it.each<[unknown, string]>([
    [1.5, 'isInt'],
    [2_147_483_648, 'max'],
    [undefined, 'isInt'],
    [0, 'min'],
  ])('recusa %p com a regra %s', async (amount, rule) => {
    expect(await validate({ amount })).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { amount: rule },
    });
  });

  it('aceita valor inteiro dentro do teto', async () => {
    expect(await validate({ amount: 100_000 })).toBeUndefined();
  });
});
