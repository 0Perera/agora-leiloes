import type { CreateLotRequest } from '../../shared/api/types';
import { fromLocalInput } from '../../shared/lib/date';
import { formatMoney, parseAmount } from '../../shared/lib/money';

export type LotField = 'startingBid' | 'increment' | 'startsAt' | 'endsAt';
export type LotForm = Record<LotField, string>;
export type LotErrors = Partial<Record<LotField, string>>;
export type LotConditions = Omit<CreateLotRequest, 'artworkId'>;

export const minAmount = 100;
export const maxStartingBid = 1_000_000_000;
export const maxIncrement = 100_000_000;
// mesma tolerância da API para o início no passado
const startTolerance = 60_000;

export const lotMessages = {
  startingBidEmpty: 'Informe o lance inicial.',
  startingBidMin: `O lance inicial mínimo é ${formatMoney(minAmount)}.`,
  startingBidMax: `O lance inicial pode ir até ${formatMoney(maxStartingBid)}.`,
  incrementEmpty: 'Informe o aumento mínimo por lance.',
  incrementMin: `O aumento mínimo é ${formatMoney(minAmount)}.`,
  incrementMax: `O aumento mínimo pode ir até ${formatMoney(maxIncrement)}.`,
  amountFormat: 'Use só números, com até dois centavos. Ex.: 1.500,50',
  startsAtEmpty: 'Informe quando o lote abre.',
  startsAtPast: 'O início não pode estar no passado.',
  endsAtEmpty: 'Informe quando o lote fecha.',
  endsAtAfterStart: 'O fim precisa ser depois do início.',
  endsAtPast: 'O fim não pode estar no passado.',
  dateFormat: 'Informe data e hora completas.',
};

type AmountMessages = { empty: string; min: string; max: string };

const startingBidMessages: AmountMessages = {
  empty: lotMessages.startingBidEmpty,
  min: lotMessages.startingBidMin,
  max: lotMessages.startingBidMax,
};

const incrementMessages: AmountMessages = {
  empty: lotMessages.incrementEmpty,
  min: lotMessages.incrementMin,
  max: lotMessages.incrementMax,
};

type Checked<T> = { value: T } | { error: string };

export function validateLot(
  form: LotForm,
  now: Date,
): { conditions: LotConditions } | { errors: LotErrors } {
  const startingBid = checkAmount(
    form.startingBid,
    maxStartingBid,
    startingBidMessages,
  );
  const increment = checkAmount(
    form.increment,
    maxIncrement,
    incrementMessages,
  );
  const startsAt = checkStart(form.startsAt, now);
  const endsAt = checkEnd(form.endsAt, form.startsAt);
  if (
    'value' in startingBid &&
    'value' in increment &&
    'value' in startsAt &&
    'value' in endsAt
  ) {
    return {
      conditions: {
        startingBid: startingBid.value,
        increment: increment.value,
        startsAt: startsAt.value,
        endsAt: endsAt.value,
      },
    };
  }
  return { errors: errorsOf({ startingBid, increment, startsAt, endsAt }) };
}

function errorsOf(
  checks: Record<LotField, Checked<number> | Checked<string>>,
): LotErrors {
  const errors: LotErrors = {};
  for (const [field, check] of Object.entries(checks)) {
    if ('error' in check) errors[field as LotField] = check.error;
  }
  return errors;
}

function checkAmount(
  text: string,
  max: number,
  messages: AmountMessages,
): Checked<number> {
  if (text.trim() === '') return { error: messages.empty };
  const amount = parseAmount(text);
  if (amount === null) return { error: lotMessages.amountFormat };
  if (amount < minAmount) return { error: messages.min };
  if (amount > max) return { error: messages.max };
  return { value: amount };
}

function checkStart(text: string, now: Date): Checked<string> {
  if (text === '') return { error: lotMessages.startsAtEmpty };
  const iso = fromLocalInput(text);
  if (iso === null) return { error: lotMessages.dateFormat };
  if (Date.parse(iso) < now.getTime() - startTolerance)
    return { error: lotMessages.startsAtPast };
  return { value: iso };
}

function checkEnd(text: string, startText: string): Checked<string> {
  if (text === '') return { error: lotMessages.endsAtEmpty };
  const iso = fromLocalInput(text);
  if (iso === null) return { error: lotMessages.dateFormat };
  const start = fromLocalInput(startText);
  if (start !== null && Date.parse(iso) <= Date.parse(start))
    return { error: lotMessages.endsAtAfterStart };
  return { value: iso };
}
