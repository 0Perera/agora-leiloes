import { validate } from '../../common/validate.testing';
import { MyBidsQueryDto } from './my-bids-query.dto';

describe('MyBidsQueryDto', () => {
  it('recusa section fora da lista', async () => {
    expect(await validate(MyBidsQueryDto, { section: 'foo' }, 'query')).toEqual(
      {
        code: 'VALIDATION_FAILED',
        fields: { section: 'isIn' },
      },
    );
  });
});
