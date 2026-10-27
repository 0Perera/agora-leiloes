import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/api/client';
import { cancelError, createError } from './lot-errors';
import { lotMessages } from './lot-validation';

describe('createError', () => {
  it('traduz IMAGE_DOWNLOAD_FAILED', () => {
    expect(
      createError(new ApiError(502, { code: 'IMAGE_DOWNLOAD_FAILED' })),
    ).toEqual({
      fields: {},
      notice:
        'Não foi possível baixar a imagem da obra no acervo do museu. Tente de novo em instantes ou escolha outra obra.',
    });
  });

  it('traduz VALIDATION_FAILED por campo', () => {
    const error = new ApiError(400, {
      code: 'VALIDATION_FAILED',
      fields: { startsAt: 'notInPast', endsAt: 'afterStart' },
    });
    expect(createError(error)).toEqual({
      fields: {
        startsAt: lotMessages.startsAtPast,
        endsAt: lotMessages.endsAtAfterStart,
      },
      notice: null,
    });
  });
});

describe('cancelError', () => {
  it('traduz LOT_HAS_BIDS', () => {
    expect(cancelError(new ApiError(409, { code: 'LOT_HAS_BIDS' }), 7)).toEqual(
      {
        title: 'Cancelamento recusado',
        text: 'Um lance chegou no Lote VII antes do cancelamento, então o lote continua no ar.',
      },
    );
  });

  it('traduz LOT_ENDED', () => {
    expect(cancelError(new ApiError(422, { code: 'LOT_ENDED' }), 7)).toEqual({
      title: 'Cancelamento recusado',
      text: 'O Lote VII encerrou antes do cancelamento, então o resultado vale.',
    });
  });
});
