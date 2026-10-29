import { validate } from '../../common/validate.testing';
import { DashboardQueryDto } from './dashboard-query.dto';

describe('DashboardQueryDto', () => {
  it('recusa status fora da lista', async () => {
    expect(
      await validate(DashboardQueryDto, { status: 'foo' }, 'query'),
    ).toEqual({
      code: 'VALIDATION_FAILED',
      fields: { status: 'isIn' },
    });
  });
});
