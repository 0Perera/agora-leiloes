import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsOrder,
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  Not,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { forLot } from '../audit/alias';
import { GENESIS, sealLot } from '../audit/chain';
import { Bid } from '../bids/bid.entity';
import type { ArtworkDetail } from '../catalog/artwork.mapper';
import { CatalogService } from '../catalog/catalog.service';
import type { ImageFile } from '../catalog/cleveland.client';
import type { AuthUser } from '../common/auth.guard';
import { Clock } from '../common/clock';
import { Env } from '../config/env.validation';
import { CreateLotDto } from './dto/create-lot.dto';
import { ListLotsQueryDto } from './dto/list-lots-query.dto';
import {
  LotCardDto,
  LotStatus,
  toLotCard,
  type CardFields,
} from './dto/lot-card.dto';
import { LotDetailDto, toLotDetail } from './dto/lot-detail.dto';
import type { CreatedLot } from './dto/lot-response.dto';
import { LotCountsDto, LotShowcaseDto } from './dto/lot-showcase.dto';
import { LotImage } from './lot-image.entity';
import { STATUS_SQL, STATUS_WHERE } from './lot-status';
import { Lot } from './lot.entity';
import {
  assertAvailable,
  assertCancellable,
  scheduleErrors,
} from './lot.rules';

const PAGE_SIZE = 12;

const STATUS_ORDER: Record<LotStatus, [string, 'ASC' | 'DESC']> = {
  live: ['lot.endsAt', 'ASC'],
  scheduled: ['lot.startsAt', 'ASC'],
  ended: ['lot.endsAt', 'DESC'],
};

const CARD_COLUMNS = [
  'id',
  'number',
  'title',
  'artist',
  'startingBid',
  'currentBid',
  'startsAt',
  'endsAt',
] as const;

const DETAIL_COLUMNS = [
  ...CARD_COLUMNS,
  'artworkId',
  'accessionNumber',
  'date',
  'type',
  'technique',
  'measurements',
  'description',
  'department',
  'increment',
  'bidCount',
] as const;

// Filtro pelo índice bids_user_id; fora do licitante, :bidderId é nulo e o EXISTS dá falso.
const HAS_BID_SQL =
  'EXISTS (SELECT 1 FROM bids bid WHERE bid.user_id = :bidderId AND bid.lot_id = lot.id)';

type Candidate = {
  status: LotStatus;
  where: FindOptionsWhere<Lot>;
  order: FindOptionsOrder<Lot>;
};

type Conditions = Pick<
  Lot,
  'startingBid' | 'increment' | 'startsAt' | 'endsAt'
>;

@Injectable()
export class LotsService {
  private readonly secret: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly catalog: CatalogService,
    private readonly clock: Clock,
    @InjectRepository(LotImage) private readonly images: Repository<LotImage>,
    @InjectRepository(Lot) private readonly lots: Repository<Lot>,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('BID_HMAC_SECRET', { infer: true });
  }

  async list(query: ListLotsQueryDto): Promise<LotShowcaseDto> {
    const now = this.clock.now();
    const [order, direction] = STATUS_ORDER[query.status];
    const { entities, raw } = await this.search(now, query)
      .select(CARD_COLUMNS.map((column) => `lot.${column}`))
      .addSelect(STATUS_SQL, 'status')
      .andWhere(STATUS_WHERE[query.status])
      .orderBy(order, direction)
      .addOrderBy('lot.number', 'ASC')
      .offset((query.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .getRawAndEntities<{ status: LotStatus }>();
    const counts = await this.counts(now, query);
    return {
      items: entities.map((lot, index) => toLotCard(lot, raw[index].status)),
      page: query.page,
      pageSize: PAGE_SIZE,
      total: counts[query.status],
      counts,
    };
  }

  // Cadeia do destaque (D-037): para no primeiro achado, então são no máximo 3 queries.
  async featured(): Promise<LotCardDto | null> {
    for (const candidate of featuredChain(this.clock.now())) {
      const lot: CardFields | null = await this.lots.findOne({
        select: [...CARD_COLUMNS],
        where: { ...candidate.where, cancelledAt: IsNull() },
        order: candidate.order,
      });
      if (lot) return toLotCard(lot, candidate.status);
    }
    return null;
  }

  // Só licitante recebe me: leiloeiro não dá lance, então não tem alias no lote.
  async find(id: number, viewer?: AuthUser): Promise<LotDetailDto> {
    const now = this.clock.now();
    const bidderId = viewer?.role === 'BIDDER' ? viewer.id : null;
    const { entities, raw } = await this.visible(now)
      .select(DETAIL_COLUMNS.map((column) => `lot.${column}`))
      .addSelect(STATUS_SQL, 'status')
      .addSelect(HAS_BID_SQL, 'hasBid')
      .andWhere('lot.id = :id', { id })
      .setParameter('bidderId', bidderId)
      .getRawAndEntities<{ status: LotStatus; hasBid: boolean }>();
    if (entities.length === 0) throw new NotFoundException();
    const me =
      bidderId === null
        ? undefined
        : {
            alias: forLot(this.secret, bidderId, id),
            hasBid: raw[0].hasBid,
          };
    return toLotDetail(entities[0], raw[0].status, now, me);
  }

  async assertExists(id: number): Promise<void> {
    const exists = await this.lots.exists({
      where: { id, cancelledAt: IsNull() },
    });
    if (!exists) throw new NotFoundException();
  }

  async create(auctioneerId: number, dto: CreateLotDto): Promise<CreatedLot> {
    const conditions = toConditions(dto);
    const fields = scheduleErrors(conditions, this.clock.now());
    if (Object.keys(fields).length > 0) throw invalid(fields);

    const artwork = await this.catalog.find(dto.artworkId);
    if (!artwork) throw invalid({ artworkId: 'notFound' });
    // Download fora da transação: nada de rede com transação aberta.
    const image = await this.catalog.image(artwork.imageUrl);

    return this.dataSource.transaction((manager) =>
      this.insert(manager, { auctioneerId, artwork, conditions, image }),
    );
  }

  // Lote alheio, inexistente ou já cancelado dá o mesmo 404: não revela que o lote existe.
  async cancel(auctioneerId: number, id: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const lots = manager.getRepository(Lot);
      const lot = await lots.findOne({
        select: { id: true, endsAt: true },
        where: { id, auctioneerId, cancelledAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lot) throw new NotFoundException();
      // Depois do lock: um lance que chegou antes já está em bids, e bid_count é só exibição.
      const hasBids = await manager
        .getRepository(Bid)
        .exists({ where: { lotId: id } });
      const now = this.clock.now();
      assertCancellable({ endsAt: lot.endsAt, hasBids }, now);
      await lots.update({ id }, { cancelledAt: now });
    });
  }

  async image(id: number): Promise<ImageFile> {
    const image = await this.images.findOne({
      select: { contentType: true, bytes: true },
      where: { lotId: id },
    });
    if (!image) throw new NotFoundException();
    return { contentType: image.contentType, bytes: image.bytes };
  }

  private async counts(
    now: Date,
    query: ListLotsQueryDto,
  ): Promise<LotCountsDto> {
    const row = await this.search(now, query)
      .select(`COUNT(*) FILTER (WHERE ${STATUS_WHERE.live})::int`, 'live')
      .addSelect(
        `COUNT(*) FILTER (WHERE ${STATUS_WHERE.scheduled})::int`,
        'scheduled',
      )
      .addSelect(`COUNT(*) FILTER (WHERE ${STATUS_WHERE.ended})::int`, 'ended')
      .getRawOne<LotCountsDto>();
    return row ?? { live: 0, scheduled: 0, ended: 0 };
  }

  private search(now: Date, query: ListLotsQueryDto): SelectQueryBuilder<Lot> {
    const builder = this.visible(now);
    if (query.q) {
      builder.andWhere(
        '(lot.title ILIKE :pattern OR lot.artist ILIKE :pattern)',
        {
          pattern: `%${escapeLike(query.q)}%`,
        },
      );
    }
    if (query.number !== undefined) {
      builder.andWhere('lot.number = :number', { number: query.number });
    }
    return builder;
  }

  private visible(now: Date): SelectQueryBuilder<Lot> {
    return this.lots
      .createQueryBuilder('lot')
      .where('lot.cancelledAt IS NULL')
      .setParameter('now', now);
  }

  private async insert(
    manager: EntityManager,
    draft: {
      auctioneerId: number;
      artwork: ArtworkDetail;
      conditions: Conditions;
      image: ImageFile;
    },
  ): Promise<CreatedLot> {
    const { auctioneerId, artwork, conditions, image } = draft;
    // Serializa criações da mesma peça: sem o lock, duas checagens simultâneas passariam juntas.
    await manager.query('SELECT pg_advisory_xact_lock($1)', [artwork.id]);
    const now = this.clock.now();
    const lots = manager.getRepository(Lot);
    const listed = await lots.find({
      select: { id: true, cancelledAt: true, endsAt: true },
      where: { artworkId: artwork.id, endsAt: MoreThan(now) },
    });
    assertAvailable(listed, now);

    const snapshot = toSnapshot(artwork);
    const result = await lots.insert({
      auctioneerId,
      ...snapshot,
      ...conditions,
    });
    const id = Number(result.identifiers[0].id);
    const generated: unknown = result.generatedMaps[0]?.number;
    if (typeof generated !== 'number') throw new Error('lot number missing');
    // Selo vazio desde a criação: selo nulo só existe em lote anterior à 4.3 (D-058).
    const seal = sealLot(this.secret, {
      lotId: id,
      count: 0,
      lastHash: GENESIS,
    });
    await lots.update({ id }, { seal });

    await manager.getRepository(LotImage).insert({
      lotId: id,
      contentType: image.contentType,
      bytes: image.bytes,
    });
    return { id, number: generated, ...snapshot, ...conditions };
  }
}

function featuredChain(now: Date): Candidate[] {
  const live = { startsAt: LessThanOrEqual(now), endsAt: MoreThan(now) };
  return [
    {
      status: 'live',
      where: { ...live, currentBid: Not(IsNull()) },
      order: { currentBid: 'DESC', endsAt: 'ASC', number: 'ASC' },
    },
    { status: 'live', where: live, order: { endsAt: 'ASC', number: 'ASC' } },
    {
      status: 'scheduled',
      where: { startsAt: MoreThan(now) },
      order: { startsAt: 'ASC', number: 'ASC' },
    },
  ];
}

// O termo da busca é literal: curingas do LIKE digitados pelo usuário não valem como curinga.
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

function toConditions(dto: CreateLotDto): Conditions {
  return {
    startingBid: dto.startingBid,
    increment: dto.increment,
    startsAt: new Date(dto.startsAt),
    endsAt: new Date(dto.endsAt),
  };
}

function toSnapshot(artwork: ArtworkDetail) {
  return {
    artworkId: artwork.id,
    accessionNumber: artwork.accessionNumber,
    title: artwork.title,
    artist: artwork.artist,
    date: artwork.date,
    type: artwork.type,
    technique: artwork.technique,
    measurements: artwork.measurements,
    description: artwork.description,
    department: artwork.department,
  };
}

function invalid(fields: Record<string, string>): BadRequestException {
  return new BadRequestException({ code: 'VALIDATION_FAILED', fields });
}
