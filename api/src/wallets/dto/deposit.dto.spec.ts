import { BadRequestException } from '@nestjs/common';
import { validationPipe } from '../../common/validation.pipe';
import { DepositDto } from './deposit.dto';

async function validate(body: unknown): Promise<unknown> {
  try {
    await validationPipe().transform(body, {
      type: 'body',
      metatype: DepositDto,
    });
  } catch (error) {
    if (error instanceof BadRequestException) return error.getResponse();
    throw error;
  }
  return undefined;
}

describe('DepositDto', () => {
  it.each([100, 10_000_000])('aceita %p', async (amount) => {
    expect(await validate({ amount })).toBeUndefined();
  });

  it.each<[unknown, string]>([
    [99, 'min'],
    [10_000_001, 'max'],
    [150.5, 'isInt'],
    ['100', 'isInt'],
  ])('recusa %p com a regra %s', async (amount, rule) => {
    expect(await validate({ amount })).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { amount: rule },
    });
  });
});
