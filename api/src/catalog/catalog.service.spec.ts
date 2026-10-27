import { DomainException } from '../common/domain.exception';
import { CatalogPage, CatalogSearch, CatalogService } from './catalog.service';
import { ClevelandClient, ClevelandSearch } from './cleveland.client';
import { SearchCache } from './search.cache';

const TTL_MS = 10 * 60 * 1000;

class FakeCleveland {
  calls: ClevelandSearch[] = [];
  failure: Error | null = null;

  search(search: ClevelandSearch): Promise<unknown> {
    this.calls.push(search);
    if (this.failure) return Promise.reject(this.failure);
    return Promise.resolve({
      info: { total: 1 },
      data: [
        {
          id: 1,
          title: 'Water Lilies',
          images: { web: { url: 'https://cdn.example/x.jpg' } },
        },
      ],
    });
  }

  find(): Promise<unknown> {
    return Promise.resolve(null);
  }
}

function makeSearch(override: Partial<CatalogSearch> = {}): CatalogSearch {
  return {
    q: 'monet',
    department: 'European Painting and Sculpture',
    page: 1,
    ...override,
  };
}

function makeService() {
  const client = new FakeCleveland();
  const clock = { now: 0 };
  const cache = new SearchCache<CatalogPage>(TTL_MS, 500, () => clock.now);
  const service = new CatalogService(
    client as unknown as ClevelandClient,
    cache,
  );
  return { service, client, clock };
}

describe('CatalogService.search', () => {
  it('responde busca repetida dentro do TTL pelo cache', async () => {
    const { service, client, clock } = makeService();

    await service.search(makeSearch({ q: 'monet' }));
    clock.now = TTL_MS - 1;
    await service.search(makeSearch({ q: '  MONET ' }));

    expect(client.calls).toHaveLength(1);
  });

  it('chama a Cleveland de novo depois do TTL', async () => {
    const { service, client, clock } = makeService();

    await service.search(makeSearch());
    clock.now = TTL_MS;
    await service.search(makeSearch());

    expect(client.calls).toHaveLength(2);
  });

  it('converte falha do client em CATALOG_UNAVAILABLE', async () => {
    const { service, client } = makeService();
    client.failure = new Error('network down');

    await expect(service.search(makeSearch())).rejects.toThrow(
      new DomainException('CATALOG_UNAVAILABLE'),
    );
  });

  it('não guarda falha no cache', async () => {
    const { service, client } = makeService();
    client.failure = new Error('network down');
    await expect(service.search(makeSearch())).rejects.toThrow();

    client.failure = null;
    await service.search(makeSearch());

    expect(client.calls).toHaveLength(2);
  });
});
