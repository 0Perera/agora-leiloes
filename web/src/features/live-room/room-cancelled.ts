import type { BidHistoryItem, LotDetail } from '../../shared/api/types';

// o líder é quem tinha o comprometido no lote; só ele recebe o aviso do estorno
export function cancelledText(
  lot: Pick<LotDetail, 'me'>,
  top: Pick<BidHistoryItem, 'alias'> | undefined,
): string {
  const leader = top !== undefined && top.alias === lot.me?.alias;
  return leader
    ? 'Lote cancelado pelo leiloeiro. Seu saldo comprometido foi devolvido.'
    : 'Lote cancelado pelo leiloeiro.';
}
