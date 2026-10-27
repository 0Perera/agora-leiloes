import { BadRequestException } from '@nestjs/common';
import { validationPipe } from '../../common/validation.pipe';
import { DashboardQueryDto } from './dashboard-query.dto';

async function validate(query: unknown): Promise<unknown> {
  try {
    await validationPipe().transform(query, {
      type: 'query',
      metatype: DashboardQueryDto,
    });
  } catch (error) {
    if (error instanceof BadRequestException) return error.getResponse();
    throw error;
  }
  return undefined;
}

describe('DashboardQueryDto', () => {
  it('recusa status fora da lista', async () => {
    expect(await validate({ status: 'foo' })).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { status: 'isIn' },
    });
  });
});
