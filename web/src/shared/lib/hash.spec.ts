import { describe, expect, it } from 'vitest';
import { shortHash } from './hash';

describe('shortHash', () => {
  it('mostra os 8 primeiros e os 8 últimos caracteres do hash', () => {
    const hash =
      '9f3c2a7d1be84f06c5a9e2d7710b3c4e8a51d6f0a2c9b7e4d1f08a3e6c1a71e0';
    expect(shortHash(hash)).toBe('9f3c2a7d…6c1a71e0');
  });
});
