import { describe, expect, it } from 'vitest';
import { toRoman } from './roman';

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
