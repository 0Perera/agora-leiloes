import { describe, expect, it } from 'vitest';
import type { LotDetail } from '../../shared/api/types';
import {
  awaitsSettlement,
  countNote,
  parseLotId,
  retryTurn,
  summaryOf,
  topMark,
} from './room-summary';

type SummaryLot = Pick<
  LotDetail,
  'status' | 'currentBid' | 'startingBid' | 'bidCount'
>;

function makeLot(override: Partial<SummaryLot> = {}): SummaryLot {
  return {
    status: 'live',
    currentBid: null,
    startingBid: 800000,
    bidCount: 0,
    ...override,
  };
}

describe('summaryOf', () => {
  it('mostra "Lance inicial" no lote ao vivo sem lance', () => {
    expect(summaryOf(makeLot()).label).toBe('Lance inicial');
  });

  it('mostra "Lance atual" no lote ao vivo com lance', () => {
    const lot = makeLot({ currentBid: 850000, bidCount: 1 });
    expect(summaryOf(lot).label).toBe('Lance atual');
  });

  it('mostra "Lance vencedor" no lote encerrado com lance', () => {
    const lot = makeLot({ status: 'ended', currentBid: 850000, bidCount: 1 });
    expect(summaryOf(lot).label).toBe('Lance vencedor');
  });

  it('mostra "Sem lances" no lote encerrado sem lance', () => {
    expect(summaryOf(makeLot({ status: 'ended' })).bids).toBe('Sem lances');
  });
});

describe('countNote', () => {
  it('troca a nota para "Últimos minutos" abaixo de 2 min', () => {
    expect(countNote(false, 119).text).toBe(
      'Últimos minutos: um lance agora estende o fim em +2 min.',
    );
  });

  it('avisa a prorrogação quando o último lance estendeu o fim', () => {
    expect(countNote(false, 200, true).text).toBe(
      'Prorrogado em +2 min pelo último lance.',
    );
  });
});

describe('parseLotId', () => {
  it('não transforma id não numérico em busca na API', () => {
    expect(parseLotId('abc')).toBeNull();
  });
});

describe('retryTurn', () => {
  it('repete a busca no máximo 3 vezes enquanto o status não muda', () => {
    const retries = [0, 1, 2, 3].map((done) => retryTurn('live', 'live', done));
    expect(retries).toEqual([true, true, true, false]);
  });
});

describe('awaitsSettlement', () => {
  it('aguarda liquidação no lote encerrado sem resultado', () => {
    expect(awaitsSettlement({ status: 'ended', result: null })).toBe(true);
  });

  it('não aguarda no lote encerrado já liquidado', () => {
    const result = { alias: 'Licitante K7QX2M', amount: 975000 };
    expect(awaitsSettlement({ status: 'ended', result })).toBe(false);
  });
});

describe('topMark', () => {
  it('marca o último lance como "Lidera" no lote ao vivo', () => {
    expect(topMark({ status: 'live', result: null })).toBe('Lidera');
  });

  it('marca o último lance como "Arrematou" no lote liquidado com vencedor', () => {
    const result = { alias: 'Licitante K7QX2M', amount: 975000 };
    expect(topMark({ status: 'ended', result })).toBe('Arrematou');
  });

  it('marca o último lance como "Último lance" enquanto aguarda liquidação', () => {
    expect(topMark({ status: 'ended', result: null })).toBe('Último lance');
  });
});
