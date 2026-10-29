import { formatShortDate } from '../../shared/lib/date';

export type HoldNote = { title: string; detail: string };

export function moreLots(total: number, shown: number): string | null {
  const rest = total - shown;
  if (rest <= 0) return null;
  return rest === 1 ? 'e mais 1 lote' : `e mais ${rest} lotes`;
}

export function heldNote(count: number): string {
  if (count === 0) return 'nada reservado agora';
  return count === 1 ? 'reservado em 1 lote' : `reservado em ${count} lotes`;
}

// lote vencido continua comprometido até a liquidação
export function holdNote(endsAt: string, now: number): HoldNote {
  if (Date.parse(endsAt) <= now) {
    return { title: 'Você arrematou', detail: 'aguardando liquidação' };
  }
  return { title: 'Você lidera', detail: `encerra ${formatShortDate(endsAt)}` };
}
