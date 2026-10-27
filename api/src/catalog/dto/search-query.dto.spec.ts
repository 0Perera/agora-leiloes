import { BadRequestException } from '@nestjs/common';
import { validationPipe } from '../../common/validation.pipe';
import { SearchQueryDto } from './search-query.dto';

async function validate(query: unknown): Promise<unknown> {
  try {
    await validationPipe().transform(query, {
      type: 'query',
      metatype: SearchQueryDto,
    });
  } catch (error) {
    if (error instanceof BadRequestException) return error.getResponse();
    throw error;
  }
  return undefined;
}

describe('SearchQueryDto', () => {
  it('recusa departamento fora da lista', async () => {
    expect(await validate({ q: 'portrait', department: 'Prints' })).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { department: 'isIn' },
    });
  });

  it('recusa termo vazio', async () => {
    expect(await validate({ q: '   ' })).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { q: 'isNotEmpty' },
    });
  });

  it('recusa página menor que 1', async () => {
    expect(await validate({ q: 'portrait', page: '0' })).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { page: 'min' },
    });
  });
});
