import { ApiError, isNotFound } from '../../shared/api/client';
import { lotLabel } from '../../shared/lib/roman';
import { lotMessages } from './lot-validation';
import type { LotErrors, LotField } from './lot-validation';

export type Notice = { title: string; text: string };
export type CreateErrors = { fields: LotErrors; notice: string | null };

const messages = {
  alreadyListed:
    'Esta peça já está em um lote agendado ou ao vivo. Ela volta a ficar disponível quando o lote encerrar ou for cancelado.',
  imageFailed:
    'Não foi possível baixar a imagem da obra no acervo do museu. Tente de novo em instantes ou escolha outra obra.',
  catalogUnavailable:
    'O acervo do museu não respondeu. Tente de novo em instantes.',
  artworkNotFound:
    'Esta obra não foi encontrada no acervo do museu. Escolha outra.',
  connection: 'Não foi possível conectar. Tente de novo.',
};

const codeNotices: Record<string, string> = {
  ARTWORK_ALREADY_LISTED: messages.alreadyListed,
  IMAGE_DOWNLOAD_FAILED: messages.imageFailed,
  CATALOG_UNAVAILABLE: messages.catalogUnavailable,
};

const ruleMessages: Record<LotField, Record<string, string>> = {
  startingBid: {
    min: lotMessages.startingBidMin,
    max: lotMessages.startingBidMax,
  },
  increment: { min: lotMessages.incrementMin, max: lotMessages.incrementMax },
  startsAt: { notInPast: lotMessages.startsAtPast },
  endsAt: {
    afterStart: lotMessages.endsAtAfterStart,
    notInPast: lotMessages.endsAtPast,
  },
};

const fallbackMessages: Record<LotField, string> = {
  startingBid: lotMessages.amountFormat,
  increment: lotMessages.amountFormat,
  startsAt: lotMessages.dateFormat,
  endsAt: lotMessages.dateFormat,
};

export function createError(error: unknown): CreateErrors {
  if (!(error instanceof ApiError))
    return { fields: {}, notice: messages.connection };
  if (error.code === 'VALIDATION_FAILED' && error.fields)
    return validationErrors(error.fields);
  const notice = codeNotices[error.code ?? ''] ?? messages.connection;
  return { fields: {}, notice };
}

function validationErrors(fields: Record<string, string>): CreateErrors {
  const errors: LotErrors = {};
  for (const [field, rule] of Object.entries(fields)) {
    if (isLotField(field))
      errors[field] = ruleMessages[field][rule] ?? fallbackMessages[field];
  }
  const notice = fields.artworkId ? messages.artworkNotFound : null;
  return { fields: errors, notice };
}

function isLotField(field: string): field is LotField {
  return field in ruleMessages;
}

export function cancelError(error: unknown, number: number): Notice {
  const lot = lotLabel(number);
  const title = 'Cancelamento recusado';
  if (!(error instanceof ApiError))
    return { title: 'Não foi possível cancelar', text: messages.connection };
  if (error.code === 'LOT_INTEGRITY_FAILED')
    return {
      title,
      text: `O histórico de lances do ${lot} não passou na verificação de integridade, então nada foi alterado.`,
    };
  if (error.code === 'LOT_ENDED')
    return {
      title,
      text: `O ${lot} encerrou antes do cancelamento, então o resultado vale.`,
    };
  if (isNotFound(error))
    return {
      title,
      text: `O ${lot} não está mais disponível para cancelar. O livro foi atualizado.`,
    };
  return { title: 'Não foi possível cancelar', text: messages.connection };
}
