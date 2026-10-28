import type { LotDetail } from '../../shared/api/types';
import { formatMoney } from '../../shared/lib/money';

export type Ended =
  | { outcome: 'won'; amount: number; token?: string }
  | { outcome: 'closed'; text: string }
  | { outcome: 'pending' };

export function endedOf(lot: Pick<LotDetail, 'result' | 'me'>): Ended {
  const { result, me } = lot;
  if (!result) return { outcome: 'pending' };
  if (result.alias === null || result.amount === null)
    return { outcome: 'closed', text: 'O lote fechou sem lances.' };
  if (me && result.alias === me.alias)
    return { outcome: 'won', amount: result.amount, token: me.receiptToken };
  return {
    outcome: 'closed',
    text: `Arrematado por ${result.alias} por ${formatMoney(result.amount)}.`,
  };
}
