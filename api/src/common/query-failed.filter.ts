import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

// O handler padrão do Nest loga a exceção inteira, com os parâmetros da query (e-mail, hash).
// Aqui sai só a mensagem do driver, sem parâmetros nem detail.
@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter<QueryFailedError> {
  private readonly logger = new Logger('QueryFailed');

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const driverError: unknown = exception.driverError;
    const message =
      driverError instanceof Error ? driverError.message : 'unknown';
    this.logger.error(message);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, message: 'Internal server error' });
  }
}
