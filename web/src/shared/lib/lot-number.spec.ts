import { describe, expect, it } from 'vitest';
import { parseLotId } from './lot-number';

describe('parseLotId', () => {
  it('não transforma id não numérico em busca na API', () => {
    expect(parseLotId('abc')).toBeNull();
  });
});
