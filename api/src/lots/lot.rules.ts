import type { Movement } from '../bids/bid.rules';
import { DomainException } from '../common/domain.exception';

// Tolerância para o relógio do cliente e a latência entre montar o formulário e enviar.
const START_TOLERANCE_MS = 60_000;

export type Schedule = { startsAt: Date; endsAt: Date };
export type ListedLot = { cancelledAt: Date | null; endsAt: Date };
export type CancelState = { endsAt: Date; last: Movement | null };
export type Cancellation = { release: Movement | null };

export function scheduleErrors(
  { startsAt, endsAt }: Schedule,
  now: Date,
): Record<string, string> {
  // O IsISO8601 aceita formatos (semana, dia do ano) que o Date não lê.
  if (Number.isNaN(startsAt.getTime())) return { startsAt: 'isIso8601' };
  if (Number.isNaN(endsAt.getTime())) return { endsAt: 'isIso8601' };
  const fields: Record<string, string> = {};
  if (startsAt.getTime() < now.getTime() - START_TOLERANCE_MS) {
    fields.startsAt = 'notInPast';
  }
  if (endsAt.getTime() <= startsAt.getTime()) fields.endsAt = 'afterStart';
  else if (endsAt.getTime() <= now.getTime()) fields.endsAt = 'notInPast';
  return fields;
}

// Agendado ou ao vivo bloqueia a peça; encerrado ou cancelado a libera (D-051).
export function assertAvailable(lots: ListedLot[], now: Date): void {
  const active = lots.some(
    (lot) => lot.cancelledAt === null && now.getTime() < lot.endsAt.getTime(),
  );
  if (active) throw new DomainException('ARTWORK_ALREADY_LISTED');
}

// Só o líder tem comprometido: cada lance já liberou o do anterior (D-070).
export function cancellation(lot: CancelState, now: Date): Cancellation {
  if (now.getTime() >= lot.endsAt.getTime()) {
    throw new DomainException('LOT_ENDED');
  }
  return { release: lot.last };
}
