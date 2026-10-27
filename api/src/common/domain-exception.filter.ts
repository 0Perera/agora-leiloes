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
  BALANCE_LIMIT_EXCEEDED: HttpStatus.UNPROCESSABLE_ENTITY,
  CATALOG_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
  IMAGE_DOWNLOAD_FAILED: HttpStatus.BAD_GATEWAY,
  ARTWORK_ALREADY_LISTED: HttpStatus.CONFLICT,
  LOT_HAS_BIDS: HttpStatus.CONFLICT,
  LOT_ENDED: HttpStatus.UNPROCESSABLE_ENTITY,
  LOT_NOT_STARTED: HttpStatus.UNPROCESSABLE_ENTITY,
  ALREADY_WINNING: HttpStatus.UNPROCESSABLE_ENTITY,
  BID_BELOW_MINIMUM: HttpStatus.UNPROCESSABLE_ENTITY,
  INSUFFICIENT_BALANCE: HttpStatus.UNPROCESSABLE_ENTITY,
};

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter<DomainException> {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { code, detail } = exception;
    response.status(STATUS[code]).json({ ...detail, code });
  }
}
