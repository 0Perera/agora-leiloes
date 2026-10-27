import { describe, expect, it } from 'vitest';
import { gaugeOf } from './gauge';

const makeWallet = (balance: number, committed: number) => ({
  balance,
  committed,
  available: balance - committed,
});

describe('gaugeOf', () => {
  it('deixa a barra vazia com saldo zero', () => {
    expect(gaugeOf(makeWallet(0, 0))).toEqual({ free: 0, held: 0 });
  });

  it('enche a barra de disponível sem nada comprometido', () => {
    expect(gaugeOf(makeWallet(10_000, 0))).toEqual({ free: 100, held: 0 });
  });

  it('enche a barra de comprometido com tudo comprometido', () => {
    expect(gaugeOf(makeWallet(10_000, 10_000))).toEqual({ free: 0, held: 100 });
  });

  it('divide a barra ao meio com metade comprometida', () => {
    expect(gaugeOf(makeWallet(10_000, 5_000))).toEqual({ free: 50, held: 50 });
  });
});
