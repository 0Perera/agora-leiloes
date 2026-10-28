import type { OngoingBid } from '../../shared/api/types';
import { formatLeft } from '../../shared/lib/countdown';
import { formatMoney } from '../../shared/lib/money';

type Row = Pick<OngoingBid, 'situation' | 'awaitingSettlement'>;

export type Standing = {
  tone: 'winning' | 'outbid';
  mark: '▲' | '▼';
  text: string;
};

export type Left = { text: string; urgent: boolean };

const urgentBelow = 120;

export function standingOf({ situation, awaitingSettlement }: Row): Standing {
  if (situation === 'outbid')
    return { tone: 'outbid', mark: '▼', text: 'Você foi superado' };
  const text = awaitingSettlement
    ? 'Você arrematou · aguardando liquidação'
    : 'Você está ganhando';
  return { tone: 'winning', mark: '▲', text };
}

export function leftOf(awaitingSettlement: boolean, seconds: number): Left {
  if (awaitingSettlement)
    return { text: 'Encerrado, aguardando liquidação', urgent: false };
  if (seconds <= 0) return { text: 'encerrando', urgent: false };
  return { text: formatLeft(seconds), urgent: seconds < urgentBelow };
}

export function actionOf(
  { situation, awaitingSettlement }: Row,
  seconds: number,
): string {
  return situation === 'outbid' && !awaitingSettlement && seconds > 0
    ? 'Cobrir lance'
    : 'Abrir sala';
}

export function finalOf(amount: number | null): string {
  return amount === null ? '—' : formatMoney(amount);
}
