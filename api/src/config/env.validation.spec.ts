import 'reflect-metadata';

import { Env, validateEnv } from './env.validation';

function makeConfig(
  override: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    DATABASE_URL: 'postgres://agora:agora@localhost:5432/agora',
    DB_SSL: 'false',
    WEB_ORIGIN: 'http://localhost:5173',
    PORT: '3000',
    JWT_SECRET: 'j'.repeat(32),
    BID_HMAC_SECRET: 'b'.repeat(32),
    CLEVELAND_API_URL: 'https://openaccess-api.clevelandart.org/api',
    ...override,
  };
}

describe('envValidation.validateEnv', () => {
  it.each<[string, string | undefined]>([
    ['ausente', undefined],
    ['curto', 'b'.repeat(31)],
  ])('recusa BID_HMAC_SECRET %s', (_case, value) => {
    const config = makeConfig({ BID_HMAC_SECRET: value });

    expect(() => validateEnv(Env, config)).toThrow(/BID_HMAC_SECRET/);
  });

  it('aceita BID_HMAC_SECRET com 32 caracteres', () => {
    expect(() => validateEnv(Env, makeConfig())).not.toThrow();
  });

  it('não cita o valor do segredo na mensagem de erro', () => {
    const secret = 'leak-check-secret-31-characters';
    const config = makeConfig({ BID_HMAC_SECRET: secret });

    expect(() => validateEnv(Env, config)).toThrow(Error);
    expect(() => validateEnv(Env, config)).not.toThrow(secret);
  });
});
