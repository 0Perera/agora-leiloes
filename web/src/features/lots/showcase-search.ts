import type { LotFilter } from '../../shared/api/types';
import { fromRoman } from '../../shared/lib/roman';

const maxNumber = 2_147_483_647;
const prefix = /^lote\s+/i;
const digits = /^\d+$/;

// null: o termo é um número de lote que não existe, e a API nem é chamada
export function parseSearch(text: string): LotFilter | null {
  const term = text.trim();
  if (term === '') return {};
  const rest = term.replace(prefix, '');
  const prefixed = rest !== term;
  // romano minúsculo só com "lote " na frente: "di" e "mix" são nomes do acervo
  const number = digits.test(rest)
    ? Number(rest)
    : fromRoman(prefixed ? rest.toUpperCase() : rest);
  if (number === null) return { q: term };
  return number >= 1 && number <= maxNumber ? { number } : null;
}
