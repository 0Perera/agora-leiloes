import { ConfigService } from '@nestjs/config';
import { DataSource, IsNull, Repository } from 'typeorm';
import { GENESIS, sealLot } from '../audit/chain';
import { Bid } from '../bids/bid.entity';
import type { ArtworkDetail } from '../catalog/artwork.mapper';
import { NotFoundException } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { DomainException } from '../common/domain.exception';
import { Env } from '../config/env.validation';
import { CreateLotDto } from './dto/create-lot.dto';
import type { CardFields } from './dto/lot-card.dto';
import { LotImage } from './lot-image.entity';
import { Lot } from './lot.entity';
import { LotsService } from './lots.service';

const NOW = new Date('2026-10-26T12:00:00Z');

const config = {
  get: () => 'test-secret',
} as unknown as ConfigService<Env, true>;

function makeArtwork(): ArtworkDetail {
  return {
    id: 135382,
    title: 'Portrait of a Lady',
    artist: 'Rembrandt van Rijn',
    date: '1632',
    type: 'Painting',
    technique: 'oil on canvas',
    imageUrl: 'https://openaccess-cdn.clevelandart.org/x.jpg',
    accessionNumber: '1950.1',
    measurements: '100 x 80 cm',
    description: null,
    department: 'European Painting and Sculpture',
  };
}

function makeDto(): CreateLotDto {
  return {
    artworkId: 135382,
    startingBid: 100_000,
    increment: 5_000,
    startsAt: '2026-10-27T12:00:00Z',
    endsAt: '2026-10-28T12:00:00Z',
  };
}

describe('LotsService.create', () => {
  it('não grava lote quando a imagem falha', async () => {
    const catalog = {
      find: () => Promise.resolve(makeArtwork()),
      image: () => Promise.reject(new DomainException('IMAGE_DOWNLOAD_FAILED')),
    };
    const dataSource = { transaction: jest.fn() };
    const service = new LotsService(
      dataSource as unknown as DataSource,
      catalog as unknown as CatalogService,
      { now: () => NOW },
      {} as Repository<LotImage>,
      {} as Repository<Lot>,
      config,
    );

    await expect(service.create(1, makeDto())).rejects.toThrow(
      new DomainException('IMAGE_DOWNLOAD_FAILED'),
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('grava o selo vazio do lote na mesma transação da criação', async () => {
    const catalog = {
      find: () => Promise.resolve(makeArtwork()),
      image: () =>
        Promise.resolve({ contentType: 'image/jpeg', bytes: Buffer.from('x') }),
    };
    const lots = {
      find: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockResolvedValue({
        identifiers: [{ id: 5 }],
        generatedMaps: [{ number: 1 }],
      }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const images = { insert: jest.fn().mockResolvedValue(undefined) };
    const manager = {
      query: jest.fn().mockResolvedValue(undefined),
      getRepository: (entity: unknown) => (entity === Lot ? lots : images),
    };
    const dataSource = {
      transaction: (fn: (manager: unknown) => Promise<unknown>) => fn(manager),
    };
    const service = new LotsService(
      dataSource as unknown as DataSource,
      catalog as unknown as CatalogService,
      { now: () => NOW },
      {} as Repository<LotImage>,
      {} as Repository<Lot>,
      config,
    );

    await service.create(1, makeDto());

    expect(lots.update).toHaveBeenCalledWith(
      { id: 5 },
      {
        seal: sealLot('test-secret', { lotId: 5, count: 0, lastHash: GENESIS }),
      },
    );
  });
});

function makeLot(override: Partial<CardFields> = {}): CardFields {
  return {
    id: 1,
    number: 7,
    title: 'Portrait of a Lady',
    artist: 'Rembrandt van Rijn',
    startingBid: 100_000,
    currentBid: null,
    startsAt: new Date('2026-10-26T10:00:00Z'),
    endsAt: new Date('2026-10-27T10:00:00Z'),
    ...override,
  };
}

function makeFeatured(...results: (CardFields | null)[]) {
  const findOne = jest.fn();
  for (const result of results) findOne.mockResolvedValueOnce(result);
  const service = new LotsService(
    {} as DataSource,
    {} as CatalogService,
    { now: () => NOW },
    {} as Repository<LotImage>,
    { findOne } as unknown as Repository<Lot>,
    config,
  );
  return { service, findOne };
}

describe('LotsService.featured', () => {
  it('devolve o ao vivo com maior lance, desempatando por fim mais próximo e depois por número', async () => {
    const lot = makeLot({ currentBid: 150_000 });
    const { service, findOne } = makeFeatured(lot);

    expect(await service.featured()).toEqual({ ...lot, status: 'live' });
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cancelledAt: IsNull() }) as unknown,
        order: { currentBid: 'DESC', endsAt: 'ASC', number: 'ASC' },
      }),
    );
  });

  it('sem ao vivo com lance, devolve o ao vivo que encerra primeiro', async () => {
    const lot = makeLot();
    const { service, findOne } = makeFeatured(null, lot);

    expect(await service.featured()).toEqual({ ...lot, status: 'live' });
    expect(findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ order: { endsAt: 'ASC', number: 'ASC' } }),
    );
  });

  it('sem ao vivo, devolve o próximo agendado', async () => {
    const lot = makeLot({ startsAt: new Date('2026-10-28T10:00:00Z') });
    const { service, findOne } = makeFeatured(null, null, lot);

    expect(await service.featured()).toEqual({ ...lot, status: 'scheduled' });
    expect(findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ order: { startsAt: 'ASC', number: 'ASC' } }),
    );
  });

  it('sem lote, devolve nulo', async () => {
    const { service, findOne } = makeFeatured(null, null, null);

    expect(await service.featured()).toBeNull();
    expect(findOne).toHaveBeenCalledTimes(3);
  });
});

function makeCancel(lot: Pick<Lot, 'id' | 'endsAt'> | null, hasBids = false) {
  const repository = {
    findOne: jest.fn().mockResolvedValue(lot),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const bids = { exists: jest.fn().mockResolvedValue(hasBids) };
  const manager = {
    getRepository: (entity: unknown) => (entity === Bid ? bids : repository),
  };
  const dataSource = {
    transaction: (fn: (manager: unknown) => Promise<unknown>) => fn(manager),
  };
  const service = new LotsService(
    dataSource as unknown as DataSource,
    {} as CatalogService,
    { now: () => NOW },
    {} as Repository<LotImage>,
    {} as Repository<Lot>,
    config,
  );
  return { service, repository, bids };
}

describe('LotsService.cancel', () => {
  it('responde 404 quando o lote não é do leiloeiro', async () => {
    const { service, repository } = makeCancel(null);

    await expect(service.cancel(2, 1)).rejects.toThrow(NotFoundException);
    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, auctioneerId: 2, cancelledAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      }),
    );
  });

  it('não grava cancelled_at quando o lote tem lance', async () => {
    const lot = { id: 1, endsAt: new Date('2026-10-27T12:00:00Z') };
    const { service, repository } = makeCancel(lot, true);

    await expect(service.cancel(2, 1)).rejects.toThrow(
      new DomainException('LOT_HAS_BIDS'),
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('recusa com LOT_HAS_BIDS quando existe lance em bids, mesmo com bid_count zero', async () => {
    const lot = {
      id: 1,
      endsAt: new Date('2026-10-27T12:00:00Z'),
      bidCount: 0,
    };
    const { service, bids } = makeCancel(lot, true);

    await expect(service.cancel(2, 1)).rejects.toThrow(
      new DomainException('LOT_HAS_BIDS'),
    );
    expect(bids.exists).toHaveBeenCalledWith({ where: { lotId: 1 } });
  });

  it('verifica lances em bids depois de travar o lote', async () => {
    const lot = { id: 1, endsAt: new Date('2026-10-28T12:00:00Z') };
    const { service, repository, bids } = makeCancel(lot);

    await service.cancel(2, 1);

    expect(repository.findOne.mock.invocationCallOrder[0]).toBeLessThan(
      bids.exists.mock.invocationCallOrder[0],
    );
  });

  it('cancela lote com bid_count acima de zero e sem lances em bids', async () => {
    const lot = {
      id: 1,
      endsAt: new Date('2026-10-28T12:00:00Z'),
      bidCount: 3,
    };
    const { service, repository } = makeCancel(lot);

    await service.cancel(2, 1);

    expect(repository.update).toHaveBeenCalledWith(
      { id: 1 },
      { cancelledAt: NOW },
    );
  });

  it('cancela lote agendado sem lances e grava cancelled_at com o now do Clock', async () => {
    const lot = { id: 1, endsAt: new Date('2026-10-28T12:00:00Z') };
    const { service, repository } = makeCancel(lot);

    await service.cancel(2, 1);

    expect(repository.update).toHaveBeenCalledWith(
      { id: 1 },
      { cancelledAt: NOW },
    );
  });
});
