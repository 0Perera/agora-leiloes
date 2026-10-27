import { BadRequestException } from '@nestjs/common';
import { validationPipe } from '../../common/validation.pipe';
import { ListLotsQueryDto } from './list-lots-query.dto';

async function validate(query: unknown): Promise<unknown> {
  try {
    await validationPipe().transform(query, {
      type: 'query',
      metatype: ListLotsQueryDto,
    });
  } catch (error) {
    if (error instanceof BadRequestException) return error.getResponse();
    throw error;
  }
  return undefined;
}

describe('ListLotsQueryDto', () => {
  it('recusa número romano', async () => {
    expect(await validate({ number: 'VII' })).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { number: 'isInt' },
    });
  });

  it('recusa status fora da lista', async () => {
    expect(await validate({ status: 'cancelled' })).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { status: 'isIn' },
    });
  });
});
