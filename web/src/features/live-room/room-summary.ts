import type { LotDetail } from '../../shared/api/types';

type SummaryLot = Pick<
  LotDetail,
  'status' | 'currentBid' | 'startingBid' | 'bidCount'
>;

export type Summary = { label: string; amount: number; bids: string };

export type CountNote = { text: string; urgent: boolean };

const urgentSeconds = 120;
const maxId = 2_147_483_647;

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

export function countNote(ended: boolean, seconds: number): CountNote {
  if (ended) return { text: 'Lote encerrado.', urgent: false };
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

// id fora do integer nunca existe: a API responderia 404 do mesmo jeito
export function parseLotId(param: string | undefined): number | null {
  if (param === undefined || !/^[1-9]\d*$/.test(param)) return null;
  const id = Number(param);
  return id <= maxId ? id : null;
}
