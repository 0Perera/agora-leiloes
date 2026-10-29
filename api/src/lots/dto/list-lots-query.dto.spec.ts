import { validate } from '../../common/validate.testing';
import { ListLotsQueryDto } from './list-lots-query.dto';

describe('ListLotsQueryDto', () => {
  it('recusa número romano', async () => {
    expect(
      await validate(ListLotsQueryDto, { number: 'VII' }, 'query'),
    ).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { number: 'isInt' },
    });
  });

  it.each(['1e3', '0x10', ' 7'])(
    'recusa número que não é só dígitos (%p)',
    async (number) => {
      expect(await validate(ListLotsQueryDto, { number }, 'query')).toEqual({
        code: 'VALIDATION_FAILED',
        fields: { number: 'isInt' },
      });
    },
  );

  it('recusa status fora da lista', async () => {
    expect(
      await validate(ListLotsQueryDto, { status: 'cancelled' }, 'query'),
    ).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { status: 'isIn' },
    });
  });
});
