import { validate } from '../../common/validate.testing';
import { SearchQueryDto } from './search-query.dto';

describe('SearchQueryDto', () => {
  it('recusa departamento fora da lista', async () => {
    expect(
      await validate(
        SearchQueryDto,
        { q: 'portrait', department: 'Prints' },
        'query',
      ),
    ).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { department: 'isIn' },
    });
  });

  it('recusa termo vazio', async () => {
    expect(await validate(SearchQueryDto, { q: '   ' }, 'query')).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { q: 'isNotEmpty' },
    });
  });

  it('recusa página menor que 1', async () => {
    expect(
      await validate(SearchQueryDto, { q: 'portrait', page: '0' }, 'query'),
    ).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { page: 'min' },
    });
  });
});
