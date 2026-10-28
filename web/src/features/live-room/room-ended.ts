import type { LotDetail } from '../../shared/api/types';
import { formatMoney } from '../../shared/lib/money';

export type Ended =
  | { outcome: 'won'; amount: number; token: string }
  | { outcome: 'closed'; text: string }
  | { outcome: 'pending' };

export function endedOf(lot: Pick<LotDetail, 'result' | 'me'>): Ended {
  const { result, me } = lot;
  if (!result) return { outcome: 'pending' };
  if (result.alias === null || result.amount === null)
    return { outcome: 'closed', text: 'O lote fechou sem lances.' };
  // a API só envia o token ao vencedor, conferido pelo id; o alias não decide nada
  if (me?.receiptToken)
    return { outcome: 'won', amount: result.amount, token: me.receiptToken };
  return {
    outcome: 'closed',
    text: `Arrematado por ${result.alias} por ${formatMoney(result.amount)}.`,
  };
}
