import { describe, expect, it } from 'vitest';
import { parseSearch } from './showcase-search';

describe('parseSearch', () => {
  it('lê "7" como número do lote', () => {
    expect(parseSearch('7')).toEqual({ number: 7 });
  });

  it('lê "VII" como número do lote', () => {
    expect(parseSearch('VII')).toEqual({ number: 7 });
  });

  it('lê "lote VII" como número do lote', () => {
    expect(parseSearch('lote VII')).toEqual({ number: 7 });
  });

  it('envia texto como busca por título ou artista', () => {
    expect(parseSearch(' Rembrandt ')).toEqual({ q: 'Rembrandt' });
  });

  it.each(['0', '99999999999'])('não busca o número impossível %s', (term) => {
    expect(parseSearch(term)).toBeNull();
  });

  it('lê "lote vii" como número do lote', () => {
    expect(parseSearch('lote vii')).toEqual({ number: 7 });
  });

  it.each(['di', 'mix'])('envia "%s" como texto', (term) => {
    expect(parseSearch(term)).toEqual({ q: term });
  });
});
