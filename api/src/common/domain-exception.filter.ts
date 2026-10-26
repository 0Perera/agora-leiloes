import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainCode, DomainException } from './domain.exception';

const STATUS: Record<DomainCode, HttpStatus> = {
  EMAIL_TAKEN: HttpStatus.CONFLICT,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  ROLE_NOT_ALLOWED: HttpStatus.FORBIDDEN,
};

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter<DomainException> {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(STATUS[exception.code]).json({ code: exception.code });
  }
}
