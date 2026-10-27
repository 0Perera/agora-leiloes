import { describe, expect, it } from 'vitest';
import { formatMoney, maskAmount, parseAmount } from './money';

describe('maskAmount', () => {
  it.each([
    ['1', '0,01'],
    ['1000', '10,00'],
    ['150050', '1.500,50'],
  ])('formata %s como %s', (text, masked) => {
    expect(maskAmount(text)).toBe(masked);
  });

  it('ignora ponto, vírgula e letras digitados', () => {
    expect(maskAmount('1.5a0,0')).toBe('15,00');
  });

  it('descarta zeros à esquerda', () => {
    expect(maskAmount('0001')).toBe('0,01');
  });

  it('devolve vazio quando não há dígitos', () => {
    expect(maskAmount('abc')).toBe('');
  });
});

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
  it('mostra valor inteiro com ,00', () => {
    expect(formatMoney(1240000)).toBe('R$ 12.400,00');
  });

  it('mostra valor com centavos em duas casas', () => {
    expect(formatMoney(150050)).toBe('R$ 1.500,50');
  });
});
