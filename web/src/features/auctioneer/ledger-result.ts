import type { DashboardLot } from '../../shared/api/types';
import { formatMoney } from '../../shared/lib/money';

type ResultLot = Pick<DashboardLot, 'status' | 'currentBid' | 'result'>;

export type Result = {
  text: string;
  sub: string;
  muted: boolean;
  who?: string;
};

export function resultOf(lot: ResultLot): Result {
  if (lot.status === 'scheduled')
    return { text: 'Aguardando', sub: '', muted: true };
  if (lot.status === 'ended') return endedResult(lot.result);
  if (lot.currentBid === null)
    return { text: 'Sem lances', sub: '', muted: true };
  return {
    text: formatMoney(lot.currentBid),
    sub: 'lance atual',
    muted: false,
  };
}

function endedResult(result: DashboardLot['result']): Result {
  if (!result) return { text: 'Aguardando liquidação', sub: '', muted: true };
  if (result.alias === null || result.amount === null)
    return { text: 'Sem lances', sub: '', muted: true };
  return {
    text: formatMoney(result.amount),
    sub: 'arrematado por',
    muted: false,
    who: result.alias,
  };
}

export function receiptOf(lot: Pick<DashboardLot, 'result'>): string | null {
  return lot.result?.receiptToken ?? null;
}

// encerrado já tem resultado; com lances, o cancelamento devolve o comprometido do líder
export function cancellable(lot: Pick<DashboardLot, 'status'>): boolean {
  return lot.status === 'live' || lot.status === 'scheduled';
}

export function cancelWarning(
  lot: Pick<DashboardLot, 'bidCount'>,
): string | null {
  return lot.bidCount > 0
    ? 'Os lances serão cancelados e o saldo comprometido volta para o licitante que está ganhando.'
    : null;
}
