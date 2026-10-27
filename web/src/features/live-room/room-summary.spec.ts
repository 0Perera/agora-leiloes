import { describe, expect, it } from 'vitest';
import type { LotDetail } from '../../shared/api/types';
import { countNote, parseLotId, summaryOf } from './room-summary';

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
});

describe('parseLotId', () => {
  it('não transforma id não numérico em busca na API', () => {
    expect(parseLotId('abc')).toBeNull();
  });
});
