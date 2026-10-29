import { maxInteger } from './limits';
import { fromRoman } from './roman';

const prefix = /^lote\s+/i;
const digits = /^\d+$/;

function isLotNumber(value: number): boolean {
  return value >= 1 && value <= maxInteger;
}

// id fora do integer nunca existe: a API responderia 404 do mesmo jeito
export function parseLotId(param: string | undefined): number | null {
  if (param === undefined || !/^[1-9]\d*$/.test(param)) return null;
  const id = Number(param);
  return isLotNumber(id) ? id : null;
}

export type LotNumber = { number: number; valid: boolean } | null;

// null: o texto não tem forma de número; anyCase lê romano minúsculo mesmo sem "lote " na frente
export function readLotNumber(text: string, anyCase = false): LotNumber {
  const term = text.trim();
  const rest = term.replace(prefix, '');
  const upper = anyCase || rest !== term;
  const number = digits.test(rest)
    ? Number(rest)
    : fromRoman(upper ? rest.toUpperCase() : rest);
  if (number === null) return null;
  return { number, valid: isLotNumber(number) };
}
