import { ApiError } from '../../shared/api/client';

const messages = {
  alreadyListed:
    'Esta peça já está em um lote agendado ou ao vivo. Ela volta a ficar disponível quando o lote encerrar ou for cancelado.',
  connection: 'Não foi possível conectar. Tente de novo.',
};

export function lotError(error: unknown): string {
  if (!(error instanceof ApiError)) return messages.connection;
  if (error.code === 'ARTWORK_ALREADY_LISTED') return messages.alreadyListed;
  return messages.connection;
}
