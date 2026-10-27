import { ApiError } from '../../shared/api/client';
import { formatShortDate } from '../../shared/lib/date';
import { formatMoney } from '../../shared/lib/money';

export type BidNotice = {
  title: string;
  text: string;
  tone: 'error' | 'info';
};

export const emptyAmount: BidNotice = {
  title: 'Informe o valor do lance.',
  text: '',
  tone: 'error',
};

const connectionFailed: BidNotice = {
  title: 'Não foi possível enviar o lance.',
  text: 'Verifique a conexão e tente de novo.',
  tone: 'error',
};

const fixed: Record<string, BidNotice> = {
  LOT_ENDED: {
    title: 'Este lote não aceita mais lances.',
    text: '',
    tone: 'error',
  },
  ALREADY_WINNING: {
    title: 'Você já está ganhando.',
    text: 'Aguarde ser superado para cobrir.',
    tone: 'info',
  },
  LOT_INTEGRITY_FAILED: {
    title: 'Lances suspensos neste lote.',
    text: 'O histórico de lances não passou na verificação de integridade. Seu lance não foi registrado.',
    tone: 'error',
  },
  VALIDATION_FAILED: emptyAmount,
};

const detailed: Record<string, (error: ApiError) => BidNotice> = {
  BID_BELOW_MINIMUM: (error) => ({
    title: 'Lance abaixo do mínimo.',
    text: amountText('O mínimo agora é', error.minimum),
    tone: 'error',
  }),
  INSUFFICIENT_BALANCE: (error) => ({
    title: 'Saldo insuficiente.',
    text: amountText('Seu disponível é', error.available),
    tone: 'error',
  }),
  LOT_NOT_STARTED: (error) => ({
    title: 'Este lote ainda não começou.',
    text: error.startsAt ? `Abre em ${formatShortDate(error.startsAt)}.` : '',
    tone: 'error',
  }),
};

export function bidError(caught: unknown): BidNotice {
  if (!(caught instanceof ApiError) || !caught.code) return connectionFailed;
  const build = detailed[caught.code];
  if (build) return build(caught);
  return fixed[caught.code] ?? connectionFailed;
}

function amountText(prefix: string, cents: number | undefined): string {
  return cents === undefined ? '' : `${prefix} ${formatMoney(cents)}.`;
}
