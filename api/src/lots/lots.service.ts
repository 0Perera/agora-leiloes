import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import type { ArtworkDetail } from '../catalog/artwork.mapper';
import { CatalogService } from '../catalog/catalog.service';
import type { ImageFile } from '../catalog/cleveland.client';
import { Clock } from '../common/clock';
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
import { assertAvailable, scheduleErrors } from './lot.rules';

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
  constructor(
    private readonly dataSource: DataSource,
    private readonly catalog: CatalogService,
    private readonly clock: Clock,
    @InjectRepository(LotImage) private readonly images: Repository<LotImage>,
    @InjectRepository(Lot) private readonly lots: Repository<Lot>,
  ) {}

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

  async find(id: number): Promise<LotDetailDto> {
    const now = this.clock.now();
    const { entities, raw } = await this.visible(now)
      .select(DETAIL_COLUMNS.map((column) => `lot.${column}`))
      .addSelect(STATUS_SQL, 'status')
      .andWhere('lot.id = :id', { id })
      .getRawAndEntities<{ status: LotStatus }>();
    if (entities.length === 0) throw new NotFoundException();
    return toLotDetail(entities[0], raw[0].status, now);
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
