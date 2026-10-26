import { Logger } from 'typeorm';
import { SafeLogger } from './safe.logger';

const PARAMETERS = ['ana@x.com', 'scrypt$secret-hash'];

function captureConsole(run: () => void): string {
  const spies = (['log', 'info', 'warn', 'error'] as const).map((method) =>
    jest.spyOn(console, method).mockImplementation(),
  );
  run();
  const output = JSON.stringify(spies.map((spy) => spy.mock.calls));
  spies.forEach((spy) => spy.mockRestore());
  return output;
}

describe('SafeLogger', () => {
  // Pela interface do TypeORM, que é como o DataSource chama o logger, com os parâmetros.
  const logger: Logger = new SafeLogger('all');

  it('loga query sem os parâmetros', () => {
    const output = captureConsole(() => {
      logger.logQuery('INSERT INTO users', PARAMETERS);
    });

    expect(output).toContain('INSERT INTO');
    expect(output).not.toContain('ana@x.com');
  });

  it('loga erro de query sem os parâmetros', () => {
    const output = captureConsole(() => {
      logger.logQueryError('duplicate key', 'INSERT INTO users', PARAMETERS);
    });

    expect(output).toContain('duplicate key');
    expect(output).not.toContain('ana@x.com');
  });

  it('loga query lenta sem os parâmetros', () => {
    const output = captureConsole(() => {
      logger.logQuerySlow(5000, 'INSERT INTO users', PARAMETERS);
    });

    expect(output).toContain('INSERT INTO');
    expect(output).not.toContain('ana@x.com');
  });
});
