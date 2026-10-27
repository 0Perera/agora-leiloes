import { describe, expect, it } from 'vitest';
import { lotLabel, toRoman } from './roman';

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
