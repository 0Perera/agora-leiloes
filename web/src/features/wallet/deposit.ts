import { ApiError } from '../../shared/api/client';
import { parseAmount } from '../../shared/lib/money';

export const minDeposit = 100;
export const maxDeposit = 1_000_000_000;

const messages = {
  empty: 'Informe o valor do depósito.',
  min: 'O depósito mínimo é R$ 1,00.',
  max: 'O limite por depósito simulado é R$ 10.000.000,00.',
  format: 'Use só números, com até dois centavos. Ex.: 1.500,50',
  balanceLimit: 'Com esse depósito, o saldo passaria do limite da carteira.',
  connection: 'Não foi possível conectar. Tente de novo.',
};

const ruleMessages: Record<string, string> = {
  min: messages.min,
  max: messages.max,
  isInt: messages.format,
};

export type Validation = { amount: number } | { error: string };

export function validateAmount(text: string): Validation {
  if (text.trim() === '') return { error: messages.empty };
  const amount = parseAmount(text);
  if (amount === null) return { error: messages.format };
  if (amount < minDeposit) return { error: messages.min };
  if (amount > maxDeposit) return { error: messages.max };
  return { amount };
}

export function depositError(error: unknown): string {
  if (!(error instanceof ApiError)) return messages.connection;
  if (error.code === 'BALANCE_LIMIT_EXCEEDED') return messages.balanceLimit;
  const rule = error.fields?.amount;
  if (error.code === 'VALIDATION_FAILED' && rule)
    return ruleMessages[rule] ?? messages.format;
  return messages.connection;
}
