import { describe, expect, it } from 'vitest';
import type { DashboardLot } from '../../shared/api/types';
import { receiptOf, resultOf } from './ledger-result';

type ResultLot = Pick<DashboardLot, 'status' | 'currentBid' | 'result'>;

function makeLot(override: Partial<ResultLot> = {}): ResultLot {
  return {
    status: 'ended',
    currentBid: 975000,
    result: {
      alias: 'Licitante #A7F2',
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
      sub: 'arrematado por Licitante #A7F2',
      muted: false,
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
