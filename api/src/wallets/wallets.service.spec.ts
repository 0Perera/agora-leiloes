import { DataSource, Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { WalletsService } from './wallets.service';

const ENDS_AT = new Date('2026-11-01T12:00:00.000Z');

function makeRow(override: Record<string, unknown> = {}) {
  return {
    id: 5,
    number: 7,
    title: 'Retrato',
    amount: 100_000,
    endsAt: ENDS_AT,
    total: 1,
    ...override,
  };
}

function makeService(rows: Record<string, unknown>[]): WalletsService {
  const builder = new Proxy(
    {},
    {
      get: (_, key) =>
        key === 'getRawMany' ? () => Promise.resolve(rows) : () => builder,
    },
  );
  const dataSource = {
    getRepository: () => ({ createQueryBuilder: () => builder }),
  };
  return new WalletsService(
    dataSource as unknown as DataSource,
    {} as Repository<Wallet>,
  );
}

describe('WalletsService.committedLots', () => {
  it('devolve o fim de cada lote comprometido', async () => {
    const service = makeService([makeRow()]);

    const committed = await service.committedLots(1);

    expect(committed.lots[0].endsAt).toBe(ENDS_AT);
  });
});
