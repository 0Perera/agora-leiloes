import { DataSource, IsNull, Repository } from 'typeorm';
import type { ArtworkDetail } from '../catalog/artwork.mapper';
import { NotFoundException } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { DomainException } from '../common/domain.exception';
import { CreateLotDto } from './dto/create-lot.dto';
import type { CardFields } from './dto/lot-card.dto';
import { LotImage } from './lot-image.entity';
import { Lot } from './lot.entity';
import { LotsService } from './lots.service';

const NOW = new Date('2026-10-26T12:00:00Z');

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
    );

    await expect(service.create(1, makeDto())).rejects.toThrow(
      new DomainException('IMAGE_DOWNLOAD_FAILED'),
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
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

function makeCancel(lot: Pick<Lot, 'id' | 'endsAt' | 'bidCount'> | null) {
  const repository = {
    findOne: jest.fn().mockResolvedValue(lot),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const manager = { getRepository: () => repository };
  const dataSource = {
    transaction: (fn: (manager: unknown) => Promise<unknown>) => fn(manager),
  };
  const service = new LotsService(
    dataSource as unknown as DataSource,
    {} as CatalogService,
    { now: () => NOW },
    {} as Repository<LotImage>,
    {} as Repository<Lot>,
  );
  return { service, repository };
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
    const lot = {
      id: 1,
      endsAt: new Date('2026-10-27T12:00:00Z'),
      bidCount: 1,
    };
    const { service, repository } = makeCancel(lot);

    await expect(service.cancel(2, 1)).rejects.toThrow(
      new DomainException('LOT_HAS_BIDS'),
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('cancela lote agendado sem lances e grava cancelled_at com o now do Clock', async () => {
    const lot = {
      id: 1,
      endsAt: new Date('2026-10-28T12:00:00Z'),
      bidCount: 0,
    };
    const { service, repository } = makeCancel(lot);

    await service.cancel(2, 1);

    expect(repository.update).toHaveBeenCalledWith(
      { id: 1 },
      { cancelledAt: NOW },
    );
  });
});
