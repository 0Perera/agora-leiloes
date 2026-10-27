import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/api/client';
import { depositError, validateAmount } from './deposit';

function validation(rule: string): ApiError {
  return new ApiError(400, {
    code: 'VALIDATION_FAILED',
    fields: { amount: rule },
  });
}

describe('validateAmount', () => {
  it.each([
    ['vazio', '  ', 'Informe o valor do depósito.'],
    ['abaixo do mínimo', '0,99', 'O depósito mínimo é R$ 1,00.'],
    [
      'acima do máximo',
      '100.000,01',
      'O limite por depósito simulado é R$ 100.000,00.',
    ],
  ])('recusa valor %s', (_case, text, error) => {
    expect(validateAmount(text)).toEqual({ error });
  });
});

describe('depositError', () => {
  it.each<[string, unknown, string]>([
    ['regra min', validation('min'), 'O depósito mínimo é R$ 1,00.'],
    [
      'regra max',
      validation('max'),
      'O limite por depósito simulado é R$ 100.000,00.',
    ],
    [
      'regra isInt',
      validation('isInt'),
      'Use só números, com até dois centavos. Ex.: 1.500,50',
    ],
    [
      'BALANCE_LIMIT_EXCEEDED',
      new ApiError(422, { code: 'BALANCE_LIMIT_EXCEEDED' }),
      'Com esse depósito, o saldo passaria do limite da carteira.',
    ],
    [
      'falha de rede',
      new ApiError(0),
      'Não foi possível conectar. Tente de novo.',
    ],
    [
      'erro 5xx',
      new ApiError(503),
      'Não foi possível conectar. Tente de novo.',
    ],
    [
      'erro inesperado',
      new TypeError('boom'),
      'Não foi possível conectar. Tente de novo.',
    ],
  ])('traduz %s', (_case, error, message) => {
    expect(depositError(error)).toBe(message);
  });
});
