import type { LotDetail } from '../../shared/api/types';
import { urgentSeconds } from '../../shared/lib/countdown';

type SummaryLot = Pick<
  LotDetail,
  'status' | 'currentBid' | 'startingBid' | 'bidCount'
>;

export type Summary = { label: string; amount: number; bids: string };

export type CountNote = { text: string; urgent: boolean };

const maxTurnRetries = 3;

export function summaryOf(lot: SummaryLot): Summary {
  return {
    label: labelOf(lot),
    amount: lot.currentBid ?? lot.startingBid,
    bids: bidsOf(lot),
  };
}

function labelOf(lot: SummaryLot): string {
  if (lot.currentBid === null) return 'Lance inicial';
  return lot.status === 'ended' ? 'Lance vencedor' : 'Lance atual';
}

function bidsOf(lot: SummaryLot): string {
  if (lot.bidCount === 1) return '1 lance';
  if (lot.bidCount > 1) return `${lot.bidCount} lances`;
  return lot.status === 'ended' ? 'Sem lances' : 'Nenhum lance ainda';
}

export function countNote(
  ended: boolean,
  seconds: number,
  extended = false,
): CountNote {
  if (ended) return { text: 'Lote encerrado.', urgent: false };
  if (extended)
    return { text: 'Prorrogado em +2 min pelo último lance.', urgent: true };
  if (seconds < urgentSeconds) {
    return {
      text: 'Últimos minutos: um lance agora estende o fim em +2 min.',
      urgent: true,
    };
  }
  return {
    text: 'Lances nos últimos 2 minutos estendem o fim em +2 min.',
    urgent: false,
  };
}

// o relógio do servidor pode virar o status um pouco depois da contagem zerar
export function retryTurn(
  before: LotDetail['status'],
  after: LotDetail['status'],
  retries: number,
): boolean {
  return after === before && retries < maxTurnRetries;
}

type SettlementLot = Pick<LotDetail, 'status' | 'result'>;

// encerrado sem resultado: o selo não conferiu ou a liquidação ainda não aconteceu
export function awaitsSettlement(lot: SettlementLot): boolean {
  return lot.status === 'ended' && lot.result === null;
}

export function topMark(lot: SettlementLot): string {
  if (lot.status !== 'ended') return 'Lidera';
  return lot.result ? 'Arrematou' : 'Último lance';
}
