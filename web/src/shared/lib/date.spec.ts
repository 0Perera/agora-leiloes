import { describe, expect, it } from 'vitest';
import { formatShortDate, fromLocalInput, toLocalInput } from './date';

describe('formatShortDate', () => {
  it('formata hora cheia em America/Sao_Paulo', () => {
    expect(formatShortDate('2026-10-24T22:00:00.000Z')).toBe('24 out, 19h');
  });

  it('formata hora com minutos em America/Sao_Paulo', () => {
    expect(formatShortDate('2026-10-24T22:30:00.000Z')).toBe('24 out, 19h30');
  });
});

describe('fromLocalInput', () => {
  it('converte datetime-local para ISO UTC e volta', () => {
    const local = new Date(2026, 9, 24, 19, 0);
    const iso = fromLocalInput('2026-10-24T19:00');
    expect(iso).toBe(local.toISOString());
    expect(toLocalInput(new Date(iso ?? ''))).toBe('2026-10-24T19:00');
  });
});
