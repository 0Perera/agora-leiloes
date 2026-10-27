import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/api/client';
import { bidError } from './bid-errors';

describe('bidError', () => {
  it('traduz BID_BELOW_MINIMUM com o mínimo do detalhe', () => {
    const error = new ApiError(422, {
      code: 'BID_BELOW_MINIMUM',
      minimum: 850_000,
    });

    expect(bidError(error)).toEqual({
      title: 'Lance abaixo do mínimo.',
      text: 'O mínimo agora é R$ 8.500,00.',
      tone: 'error',
    });
  });

  it('traduz INSUFFICIENT_BALANCE com o disponível do detalhe', () => {
    const error = new ApiError(422, {
      code: 'INSUFFICIENT_BALANCE',
      available: 120_050,
    });

    expect(bidError(error)).toEqual({
      title: 'Saldo insuficiente.',
      text: 'Seu disponível é R$ 1.200,50.',
      tone: 'error',
    });
  });

  it('traduz LOT_NOT_STARTED com a abertura do detalhe', () => {
    const error = new ApiError(422, {
      code: 'LOT_NOT_STARTED',
      startsAt: '2026-10-25T22:00:00.000Z',
    });

    expect(bidError(error)).toEqual({
      title: 'Este lote ainda não começou.',
      text: 'Abre em 25 out, 19h.',
      tone: 'error',
    });
  });

  it('traduz LOT_ENDED', () => {
    const error = new ApiError(422, { code: 'LOT_ENDED' });

    expect(bidError(error).title).toBe('Este lote não aceita mais lances.');
  });

  it('traduz ALREADY_WINNING em tom informativo', () => {
    const error = new ApiError(422, { code: 'ALREADY_WINNING' });

    expect(bidError(error)).toEqual({
      title: 'Você já está ganhando.',
      text: 'Aguarde ser superado para cobrir.',
      tone: 'info',
    });
  });

  it('traduz LOT_INTEGRITY_FAILED', () => {
    const error = new ApiError(409, { code: 'LOT_INTEGRITY_FAILED' });

    expect(bidError(error)).toEqual({
      title: 'Lances suspensos neste lote.',
      text: 'O histórico de lances não passou na verificação de integridade. Seu lance não foi registrado.',
      tone: 'error',
    });
  });

  it('traduz VALIDATION_FAILED como valor a informar', () => {
    const error = new ApiError(400, {
      code: 'VALIDATION_FAILED',
      fields: { amount: 'isInt' },
    });

    expect(bidError(error).title).toBe('Informe o valor do lance.');
  });

  it('traduz falha de rede', () => {
    expect(bidError(new ApiError(0))).toEqual({
      title: 'Não foi possível enviar o lance.',
      text: 'Verifique a conexão e tente de novo.',
      tone: 'error',
    });
  });
});
