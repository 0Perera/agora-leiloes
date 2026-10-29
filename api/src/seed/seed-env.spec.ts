import { seedEnv } from './seed-env';

describe('seedEnv', () => {
  it('recusa o ambiente sem BID_HMAC_SECRET', () => {
    expect(() => seedEnv({ DATABASE_URL: 'postgres://db/agora' })).toThrow(
      'BID_HMAC_SECRET is missing',
    );
  });
});
