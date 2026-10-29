import { pad } from './date';

const hour = 3600;
const day = 24 * hour;
export const urgentSeconds = 120;

export function clockOffset(serverTime: string, clientNow: number): number {
  return Date.parse(serverTime) - clientNow;
}

export function secondsLeft(
  endsAt: string,
  clientNow: number,
  offset: number,
): number {
  const left = Date.parse(endsAt) - (clientNow + offset);
  return Math.max(0, Math.ceil(left / 1000));
}

export type LeftUnit = 'days' | 'hours' | 'minutes';

export type SplitLeft = { first: string; second: string; unit: LeftUnit };

const shortSuffix: Record<LeftUnit, [string, string]> = {
  days: ['d ', 'h'],
  hours: ['h ', 'min'],
  minutes: [':', ''],
};

export function formatLeft(seconds: number): string {
  const { first, second, unit } = splitLeft(seconds);
  const [middle, end] = shortSuffix[unit];
  const lead = unit === 'minutes' ? first : String(Number(first));
  return `${lead}${middle}${second}${end}`;
}

// até 48h a contagem é Horas:Min (Min:Seg abaixo de 1h); acima disso, Dias:Horas
export function splitLeft(seconds: number): SplitLeft {
  const left = Math.max(0, seconds);
  if (left > 2 * day) {
    return {
      first: String(Math.floor(left / day)),
      second: pad(Math.floor((left % day) / hour)),
      unit: 'days',
    };
  }
  if (left >= hour) {
    return {
      first: pad(Math.floor(left / hour)),
      second: pad(Math.floor((left % hour) / 60)),
      unit: 'hours',
    };
  }
  return {
    first: pad(Math.floor(left / 60)),
    second: pad(left % 60),
    unit: 'minutes',
  };
}
