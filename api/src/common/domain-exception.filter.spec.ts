import { ArgumentsHost } from '@nestjs/common';
import { DomainExceptionFilter } from './domain-exception.filter';
import { DomainCode, DomainException } from './domain.exception';

function makeHost() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('DomainExceptionFilter.catch', () => {
  it.each<[DomainCode, number]>([
    ['EMAIL_TAKEN', 409],
    ['INVALID_CREDENTIALS', 401],
    ['ROLE_NOT_ALLOWED', 403],
    ['BALANCE_LIMIT_EXCEEDED', 422],
    ['CATALOG_UNAVAILABLE', 503],
    ['IMAGE_DOWNLOAD_FAILED', 502],
    ['ARTWORK_ALREADY_LISTED', 409],
  ])('responde %s com status %i e só o código', (code, status) => {
    const { host, response } = makeHost();

    new DomainExceptionFilter().catch(new DomainException(code), host);

    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({ code });
  });
});
