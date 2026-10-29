import { describe, expect, it } from 'vitest';
import { clockOffset, formatLeft, secondsLeft, splitLeft } from './countdown';

describe('formatLeft', () => {
  it('mostra minutos e segundos abaixo de 1h', () => {
    expect(formatLeft(872)).toBe('14:32');
  });

  it('mostra horas e minutos a partir de 1h', () => {
    expect(formatLeft(3905)).toBe('1h 05min');
  });

  it('mostra dias e horas acima de 48h', () => {
    expect(formatLeft(604_380)).toBe('6d 23h');
  });
});

describe('splitLeft', () => {
  it('divide em dias e horas acima de 48h', () => {
    expect(splitLeft(604_380)).toEqual({
      first: '6',
      second: '23',
      unit: 'days',
    });
  });

  it('divide em horas e minutos com exatamente 48h', () => {
    expect(splitLeft(48 * 3600)).toEqual({
      first: '48',
      second: '00',
      unit: 'hours',
    });
  });
});

describe('secondsLeft', () => {
  it('corrige o tempo restante pela diferença do serverTime', () => {
    const clientNow = Date.parse('2026-10-27T12:00:00.000Z');
    const offset = clockOffset('2026-10-27T12:01:00.000Z', clientNow);
    expect(secondsLeft('2026-10-27T12:11:00.000Z', clientNow, offset)).toBe(
      600,
    );
  });

  it('não fica negativo depois do fim', () => {
    const clientNow = Date.parse('2026-10-27T12:05:00.000Z');
    expect(secondsLeft('2026-10-27T12:00:00.000Z', clientNow, 0)).toBe(0);
  });
});
