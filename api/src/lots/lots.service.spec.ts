import { ConfigService } from '@nestjs/config';
import { DataSource, IsNull, Repository } from 'typeorm';
import { forLot } from '../audit/alias';
import { expectedSeal, GENESIS, sealLot } from '../audit/chain';
import { Bid } from '../bids/bid.entity';
import type { ArtworkDetail } from '../catalog/artwork.mapper';
import { NotFoundException } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { DomainException } from '../common/domain.exception';
import { Env } from '../config/env.validation';
import { CreateLotDto } from './dto/create-lot.dto';
import type { CardFields } from './dto/lot-card.dto';
import { LotEventsService } from './lot-events.service';
import { LotImage } from './lot-image.entity';
import { Lot } from './lot.entity';
import { LotsService } from './lots.service';
import { SettlementService } from '../settlement/settlement.service';
import { SettlementTimer } from '../settlement/settlement.timer';

const NOW = new Date('2026-10-26T12:00:00Z');

const config = {
  get: () => 'test-secret',
} as unknown as ConfigService<Env, true>;

const timer = { refresh: jest.fn() } as unknown as SettlementTimer;

const cancelled = jest.fn();

const events = { cancelled } as unknown as LotEventsService;

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
      {} as SettlementService,
      timer,
      events,
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
      {} as SettlementService,
      timer,
      events,
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

function makeCard(override: Partial<CardFields> = {}): CardFields {
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
    {} as SettlementService,
    timer,
    events,
  );
  return { service, findOne };
}

describe('LotsService.featured', () => {
  it('devolve o ao vivo com maior lance, desempatando por fim mais próximo e depois por número', async () => {
    const lot = makeCard({ currentBid: 150_000 });
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
    const lot = makeCard();
    const { service, findOne } = makeFeatured(null, lot);

    expect(await service.featured()).toEqual({ ...lot, status: 'live' });
    expect(findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ order: { endsAt: 'ASC', number: 'ASC' } }),
    );
  });

  it('sem ao vivo, devolve o próximo agendado', async () => {
    const lot = makeCard({ startsAt: new Date('2026-10-28T10:00:00Z') });
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

const EMPTY_SEAL = expectedSeal('test-secret', 1, null);

function makeCancel(lot: Pick<Lot, 'id' | 'endsAt' | 'seal'> | null) {
  const repository = {
    findOne: jest.fn().mockResolvedValue(lot),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const bids = { findOne: jest.fn().mockResolvedValue(null) };
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
    {} as SettlementService,
    timer,
    events,
  );
  return { service, repository, bids };
}

describe('LotsService.cancel', () => {
  beforeEach(() => {
    cancelled.mockClear();
  });

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

  it('não emite cancelled quando recusa lote encerrado com LOT_ENDED', async () => {
    const lot = { id: 1, endsAt: NOW, seal: EMPTY_SEAL };
    const { service } = makeCancel(lot);

    await expect(service.cancel(2, 1)).rejects.toThrow(
      new DomainException('LOT_ENDED'),
    );
    expect(cancelled).not.toHaveBeenCalled();
  });

  it('verifica lances em bids depois de travar o lote', async () => {
    const lot = {
      id: 1,
      endsAt: new Date('2026-10-28T12:00:00Z'),
      seal: EMPTY_SEAL,
    };
    const { service, repository, bids } = makeCancel(lot);

    await service.cancel(2, 1);

    expect(repository.findOne.mock.invocationCallOrder[0]).toBeLessThan(
      bids.findOne.mock.invocationCallOrder[0],
    );
  });

  it('cancela lote com bid_count acima de zero e sem lances em bids', async () => {
    const lot = {
      id: 1,
      endsAt: new Date('2026-10-28T12:00:00Z'),
      bidCount: 3,
      seal: EMPTY_SEAL,
    };
    const { service, repository } = makeCancel(lot);

    await service.cancel(2, 1);

    expect(repository.update).toHaveBeenCalledWith(
      { id: 1 },
      { cancelledAt: NOW },
    );
  });

  it('cancela lote agendado sem lances e grava cancelled_at com o now do Clock', async () => {
    const lot = {
      id: 1,
      endsAt: new Date('2026-10-28T12:00:00Z'),
      seal: EMPTY_SEAL,
    };
    const { service, repository } = makeCancel(lot);

    await service.cancel(2, 1);

    expect(repository.update).toHaveBeenCalledWith(
      { id: 1 },
      { cancelledAt: NOW },
    );
  });
});

type FindRow = {
  hasBid: boolean;
  status: 'live' | 'ended';
  settledAt: Date | null;
  receiptAlias: string | null;
  receiptAmount: number | null;
  receiptToken: string | null;
  receiptWinnerId: number | null;
};

function makeFind(override: Partial<FindRow> = {}) {
  const row: FindRow = {
    hasBid: false,
    status: 'live',
    settledAt: null,
    receiptAlias: null,
    receiptAmount: null,
    receiptToken: null,
    receiptWinnerId: null,
    ...override,
  };
  const lot = {
    ...makeCard(),
    increment: 5_000,
    bidCount: 0,
    settledAt: row.settledAt,
  };
  const builder = {
    where: () => builder,
    setParameter: () => builder,
    select: () => builder,
    addSelect: () => builder,
    andWhere: () => builder,
    leftJoin: () => builder,
    getRawAndEntities: jest.fn().mockResolvedValue({
      entities: [lot],
      raw: [row],
    }),
  };
  const lots = { createQueryBuilder: () => builder };
  const settle = jest.fn();
  const service = new LotsService(
    {} as DataSource,
    {} as CatalogService,
    { now: () => NOW },
    {} as Repository<LotImage>,
    lots as unknown as Repository<Lot>,
    config,
    { settle } as unknown as SettlementService,
    timer,
    events,
  );
  return { service, builder, settle };
}

describe('LotsService.find', () => {
  it('licitante com lance no lote recebe hasBid verdadeiro', async () => {
    const { service } = makeFind({ hasBid: true });

    const detail = await service.find(1, { id: 3, role: 'BIDDER' });

    expect(detail.me?.hasBid).toBe(true);
  });

  it('licitante sem lance no lote recebe hasBid falso', async () => {
    const { service } = makeFind({ hasBid: false });

    const detail = await service.find(1, { id: 3, role: 'BIDDER' });

    expect(detail.me?.hasBid).toBe(false);
  });

  it.each([
    ['ao vivo', { status: 'live' as const, settledAt: null }],
    ['já liquidado', { status: 'ended' as const, settledAt: NOW }],
  ])(
    'lote %s não chama a liquidação e faz uma query só',
    async (_state, override) => {
      const { service, builder, settle } = makeFind(override);

      await service.find(1);

      expect(settle).not.toHaveBeenCalled();
      expect(builder.getRawAndEntities).toHaveBeenCalledTimes(1);
    },
  );

  it('entrega o token só ao vencedor, mesmo com outro licitante de mesmo alias', async () => {
    const { service } = makeFind({
      status: 'ended',
      settledAt: NOW,
      receiptAlias: forLot('test-secret', 4, 1),
      receiptAmount: 150_000,
      receiptToken: 'token-do-vencedor',
      receiptWinnerId: 3,
    });

    const winner = await service.find(1, { id: 3, role: 'BIDDER' });
    const rival = await service.find(1, { id: 4, role: 'BIDDER' });

    expect(winner.me?.receiptToken).toBe('token-do-vencedor');
    expect(rival.me).not.toHaveProperty('receiptToken');
  });
});
