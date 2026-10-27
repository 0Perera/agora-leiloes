import { describe, expect, it } from 'vitest';
import { fromRoman, lotLabel, toRoman } from './roman';

describe('toRoman', () => {
  it.each([
    [1, 'I'],
    [4, 'IV'],
    [9, 'IX'],
    [14, 'XIV'],
    [40, 'XL'],
    [90, 'XC'],
    [400, 'CD'],
    [3999, 'MMMCMXCIX'],
  ])('converte %i para %s', (value, roman) => {
    expect(toRoman(value)).toBe(roman);
  });
});

describe('lotLabel', () => {
  it('mostra o romano com o número comum ao lado', () => {
    expect(lotLabel(537)).toBe('Lote DXXXVII · nº 537');
  });

  it('mostra só o número comum acima de 3999', () => {
    expect(lotLabel(4000)).toBe('Lote nº 4000');
  });
});

describe('fromRoman', () => {
  it.each([
    ['VII', 7],
    ['XIV', 14],
    ['MMMCMXCIX', 3999],
  ])('lê %s como %i', (roman, value) => {
    expect(fromRoman(roman)).toBe(value);
  });

  it.each(['IIII', 'VX', 'IC'])('recusa %s, fora do padrão', (roman) => {
    expect(fromRoman(roman)).toBeNull();
  });
});
