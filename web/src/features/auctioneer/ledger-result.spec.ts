import { describe, expect, it } from 'vitest';
import type { DashboardLot } from '../../shared/api/types';
import {
  cancellable,
  cancelWarning,
  receiptOf,
  resultOf,
} from './ledger-result';

type ResultLot = Pick<DashboardLot, 'status' | 'currentBid' | 'result'>;

function makeLot(override: Partial<ResultLot> = {}): ResultLot {
  return {
    status: 'ended',
    currentBid: 975000,
    result: {
      alias: 'Licitante K7QX2M',
      amount: 975000,
      receiptToken: 'token',
    },
    ...override,
  };
}

describe('resultOf', () => {
  it('mostra o valor e o apelido do vencedor no lote liquidado', () => {
    expect(resultOf(makeLot())).toEqual({
      text: 'R$ 9.750,00',
      sub: 'arrematado por',
      muted: false,
      who: 'Licitante K7QX2M',
    });
  });

  it('mostra sem lances no lote liquidado sem vencedor', () => {
    const lot = makeLot({
      currentBid: null,
      result: { alias: null, amount: null, receiptToken: null },
    });
    expect(resultOf(lot)).toEqual({ text: 'Sem lances', sub: '', muted: true });
  });

  it('mostra aguardando liquidação no lote encerrado sem resultado', () => {
    expect(resultOf(makeLot({ result: null }))).toEqual({
      text: 'Aguardando liquidação',
      sub: '',
      muted: true,
    });
  });

  it('mostra o lance atual no lote ao vivo', () => {
    const lot = makeLot({ status: 'live', result: null });
    expect(resultOf(lot)).toEqual({
      text: 'R$ 9.750,00',
      sub: 'lance atual',
      muted: false,
    });
  });
});

describe('receiptOf', () => {
  it('devolve o token do comprovante do lote arrematado', () => {
    expect(receiptOf(makeLot())).toBe('token');
  });

  it('não devolve token no lote sem comprovante', () => {
    expect(receiptOf(makeLot({ result: null }))).toBeNull();
  });
});

function makeBookLot(
  override: Partial<Pick<DashboardLot, 'status' | 'bidCount'>> = {},
): Pick<DashboardLot, 'status' | 'bidCount'> {
  return { status: 'live', bidCount: 0, ...override };
}

describe('cancellable', () => {
  it('aceita lote ao vivo com lances', () => {
    expect(cancellable(makeBookLot({ bidCount: 3 }))).toBe(true);
  });

  it('aceita lote agendado', () => {
    expect(cancellable(makeBookLot({ status: 'scheduled' }))).toBe(true);
  });

  it('recusa lote encerrado', () => {
    expect(cancellable(makeBookLot({ status: 'ended', bidCount: 3 }))).toBe(
      false,
    );
  });
});

describe('cancelWarning', () => {
  it('com lances, avisa que o comprometido volta para o líder', () => {
    expect(cancelWarning({ bidCount: 2 })).toBe(
      'Os lances continuam na auditoria e o saldo comprometido volta para quem está ganhando.',
    );
  });

  it('sem lances, não avisa nada', () => {
    expect(cancelWarning({ bidCount: 0 })).toBeNull();
  });
});
