import { readLotNumber } from '../../shared/lib/lot-number';
import { lotLabel } from '../../shared/lib/roman';

export type Lookup = { number: number } | { error: string };

export function parseLookup(text: string): Lookup {
  if (text.trim() === '')
    return { error: 'Informe o número do lote para auditar.' };
  const lot = readLotNumber(text, true);
  if (!lot?.valid) return { error: 'Use o número do lote, como 7 ou VII.' };
  return { number: lot.number };
}

export function missingText(number: number): string {
  return `${lotLabel(number)} não encontrado. Confira o número no card ou no comprovante.`;
}

export const lookupFailed =
  'Não foi possível buscar o lote agora. Tente de novo.';
