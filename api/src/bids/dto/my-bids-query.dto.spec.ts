import { BadRequestException } from '@nestjs/common';
import { validationPipe } from '../../common/validation.pipe';
import { MyBidsQueryDto } from './my-bids-query.dto';

async function validate(query: unknown): Promise<unknown> {
  try {
    await validationPipe().transform(query, {
      type: 'query',
      metatype: MyBidsQueryDto,
    });
  } catch (error) {
    if (error instanceof BadRequestException) return error.getResponse();
    throw error;
  }
  return undefined;
}

describe('MyBidsQueryDto', () => {
  it('recusa section fora da lista', async () => {
    expect(await validate({ section: 'foo' })).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { section: 'isIn' },
    });
  });
});
