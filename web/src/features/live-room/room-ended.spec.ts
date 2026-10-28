import { describe, expect, it } from 'vitest';
import type { LotDetail } from '../../shared/api/types';
import { endedOf } from './room-ended';

type EndedLot = Pick<LotDetail, 'result' | 'me'>;

function makeLot(override: Partial<EndedLot> = {}): EndedLot {
  return {
    result: { alias: 'Licitante #A7F2', amount: 975000 },
    me: { alias: 'Licitante #A7F2', hasBid: true, receiptToken: 'token' },
    ...override,
  };
}

describe('endedOf', () => {
  it('mostra o arremate ao vencedor com o token do comprovante', () => {
    expect(endedOf(makeLot())).toEqual({
      outcome: 'won',
      amount: 975000,
      token: 'token',
    });
  });

  it('mostra o vencedor e o valor a quem perdeu', () => {
    const lot = makeLot({ me: { alias: 'Licitante #B3C1', hasBid: true } });
    expect(endedOf(lot)).toEqual({
      outcome: 'closed',
      text: 'Arrematado por Licitante #A7F2 por R$ 9.750,00.',
    });
  });

  it('mostra o lote encerrado ao licitante com o alias do resultado e sem token', () => {
    const lot = makeLot({ me: { alias: 'Licitante #A7F2', hasBid: true } });
    expect(endedOf(lot)).toEqual({
      outcome: 'closed',
      text: 'Arrematado por Licitante #A7F2 por R$ 9.750,00.',
    });
  });

  it('mostra o vencedor e o valor ao visitante', () => {
    const lot = makeLot({ me: undefined });
    expect(endedOf(lot)).toEqual({
      outcome: 'closed',
      text: 'Arrematado por Licitante #A7F2 por R$ 9.750,00.',
    });
  });

  it('avisa que o lote fechou sem lances', () => {
    const lot = makeLot({ result: { alias: null, amount: null } });
    expect(endedOf(lot)).toEqual({
      outcome: 'closed',
      text: 'O lote fechou sem lances.',
    });
  });

  it('fica aguardando liquidação sem resultado', () => {
    expect(endedOf(makeLot({ result: null }))).toEqual({ outcome: 'pending' });
  });
});
