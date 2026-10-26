import { ArgumentsHost, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { QueryFailedFilter } from './query-failed.filter';

function makeHost() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('QueryFailedFilter.catch', () => {
  it('loga o erro sem os parâmetros da query', () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { host, response } = makeHost();
    const error = new QueryFailedError(
      'INSERT INTO users',
      ['ana@x.com', 'scrypt$hash'],
      new Error('value too long'),
    );

    new QueryFailedFilter().catch(error, host);

    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain('value too long');
    expect(logged).not.toContain('ana@x.com');
    expect(logged).not.toContain('scrypt$hash');
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
    log.mockRestore();
  });
});
