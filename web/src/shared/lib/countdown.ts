import { pad } from './date';

const hour = 3600;
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

export function formatLeft(seconds: number): string {
  const { first, second, inHours } = splitLeft(seconds);
  return inHours ? `${Number(first)}h ${second}min` : `${first}:${second}`;
}

// a partir de 1h a contagem passa de Min:Seg para Horas:Min
export function splitLeft(seconds: number) {
  const left = Math.max(0, seconds);
  if (left >= hour) {
    return {
      first: pad(Math.floor(left / hour)),
      second: pad(Math.floor((left % hour) / 60)),
      inHours: true,
    };
  }
  return {
    first: pad(Math.floor(left / 60)),
    second: pad(left % 60),
    inHours: false,
  };
}
