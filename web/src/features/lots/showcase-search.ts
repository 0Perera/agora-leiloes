import type { LotFilter, LotStatus } from '../../shared/api/types';
import { readLotNumber } from '../../shared/lib/lot-number';

// null: o termo é um número de lote que não existe, e a API nem é chamada
export function parseSearch(text: string): LotFilter | null {
  const term = text.trim();
  if (term === '') return {};
  // romano minúsculo só com "lote " na frente: "di" e "mix" são nomes do acervo
  const lot = readLotNumber(term);
  if (lot === null) return { q: term };
  return lot.valid ? { number: lot.number } : null;
}

const tabOrder: LotStatus[] = ['live', 'scheduled', 'ended'];

export function searchTab(
  counts: Record<LotStatus, number>,
  current: LotStatus,
): LotStatus {
  return tabOrder.find((tab) => counts[tab] > 0) ?? current;
}
