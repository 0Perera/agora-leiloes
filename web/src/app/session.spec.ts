import { describe, expect, it } from 'vitest';
import { isTokenValid } from './session';

const now = Date.UTC(2026, 9, 25, 12);

function makeToken(payload: Record<string, unknown>): string {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `eyJhbGciOiJIUzI1NiJ9.${body}.signature`;
}

describe('isTokenValid', () => {
  it('aceita token com exp no futuro', () => {
    const token = makeToken({ sub: '1', role: 'BIDDER', exp: now / 1000 + 60 });
    expect(isTokenValid(token, now)).toBe(true);
  });

  it('recusa token expirado', () => {
    const token = makeToken({ sub: '1', role: 'BIDDER', exp: now / 1000 - 60 });
    expect(isTokenValid(token, now)).toBe(false);
  });

  it.each(['', 'abc', 'a.b.c', 'a.bnVsbA.c', makeToken({ sub: '1' })])(
    'recusa token ilegível (%s)',
    (token) => {
      expect(isTokenValid(token, now)).toBe(false);
    },
  );
});
