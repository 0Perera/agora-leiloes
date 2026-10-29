import { QueryFailedError } from 'typeorm';

// Só a mensagem do driver: a exceção inteira traria os parâmetros da query (e-mail, hash).
export function errorMessage(error: unknown): string {
  if (error instanceof QueryFailedError) {
    const driverError: unknown = error.driverError;
    return driverError instanceof Error ? driverError.message : 'unknown';
  }
  return error instanceof Error ? error.message : 'unknown';
}
