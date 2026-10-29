import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { errorMessage } from './error-message';

// O handler padrão do Nest loga a exceção inteira, com os parâmetros da query (e-mail, hash).
@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter<QueryFailedError> {
  private readonly logger = new Logger('QueryFailed');

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    this.logger.error(errorMessage(exception));
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, message: 'Internal server error' });
  }
}
