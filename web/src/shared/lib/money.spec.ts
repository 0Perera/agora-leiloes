import { describe, expect, it } from 'vitest';
import { formatMoney, parseAmount } from './money';

describe('parseAmount', () => {
  it.each([
    ['1.500', 150000],
    ['1500', 150000],
    ['1.500,50', 150050],
    ['1500,5', 150050],
  ])('aceita %s', (text, cents) => {
    expect(parseAmount(text)).toBe(cents);
  });

  it('recusa texto', () => {
    expect(parseAmount('mil reais')).toBeNull();
  });

  it('recusa mais de duas casas decimais', () => {
    expect(parseAmount('10,505')).toBeNull();
  });

  it('recusa valor vazio', () => {
    expect(parseAmount('')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('mostra valor inteiro sem centavos', () => {
    expect(formatMoney(1240000)).toBe('R$ 12.400');
  });

  it('mostra valor com centavos em duas casas', () => {
    expect(formatMoney(150050)).toBe('R$ 1.500,50');
  });
});
