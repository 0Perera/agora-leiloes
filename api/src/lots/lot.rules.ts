import { DomainException } from '../common/domain.exception';

// Tolerância para o relógio do cliente e a latência entre montar o formulário e enviar.
export const START_TOLERANCE_MS = 60_000;

export type Schedule = { startsAt: Date; endsAt: Date };
export type ListedLot = { cancelledAt: Date | null; endsAt: Date };
export type CancelState = { endsAt: Date; bidCount: number };

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

// Encerrado vem primeiro: lote vencido com lance é resultado, não "chegou um lance".
export function assertCancellable(lot: CancelState, now: Date): void {
  if (now.getTime() >= lot.endsAt.getTime()) {
    throw new DomainException('LOT_ENDED');
  }
  if (lot.bidCount > 0) throw new DomainException('LOT_HAS_BIDS');
}
