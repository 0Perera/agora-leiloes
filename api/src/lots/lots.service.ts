import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { expectedSeal, GENESIS, sealLot } from '../audit/chain';
import type { Movement } from '../bids/bid.rules';
import { bidderTops } from '../bids/bidder-tops';
import { lastBid } from '../bids/last-bid';
import { standing } from '../bids/standing.rules';
import type { ArtworkDetail } from '../catalog/artwork.mapper';
import { CatalogService } from '../catalog/catalog.service';
import type { ImageFile } from '../catalog/cleveland.client';
import type { AuthUser } from '../common/auth.guard';
import { Clock } from '../common/clock';
import { errorMessage } from '../common/error-message';
import { validationFailed } from '../common/validation-failed';
import { DomainException } from '../common/domain.exception';
import { Env } from '../config/env.validation';
import { Receipt } from '../receipts/receipt.entity';
import { lockWallets, walletOf } from '../wallets/wallet.lock';
import { SettlementService } from '../settlement/settlement.service';
import { SettlementTimer } from '../settlement/settlement.timer';
import { CreateLotDto } from './dto/create-lot.dto';
import { ListLotsQueryDto } from './dto/list-lots-query.dto';
import { LotCardDto, toLotCard, type CardFields } from './dto/lot-card.dto';
import {
  LotDetailDto,
  LotResultDto,
  LotViewerDto,
  toLotDetail,
} from './dto/lot-detail.dto';
import {
  CreatedLotDto,
  toCreatedLot,
  type CreatedLotFields,
} from './dto/created-lot.dto';
import type { LotIdDto } from './dto/lot-id.dto';
import { LotCountsDto, LotShowcaseDto } from './dto/lot-showcase.dto';
import { LotEventsService } from './lot-events.service';
import { LotImage } from './lot-image.entity';
import { LotStatus, STATUS_SQL, STATUS_WHERE } from './lot-status';
import { Lot } from './lot.entity';
import { assertAvailable, cancellation, scheduleErrors } from './lot.rules';

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

type DetailRaw = {
  status: LotStatus;
  hasBid: boolean;
  receiptAlias: string | null;
  receiptAmount: number | null;
  receiptToken: string | null;
  receiptWinnerId: number | null;
};

type DetailRow = {
  lot: Lot;
  raw: DetailRaw;
};

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
  private readonly logger = new Logger(LotsService.name);
  private readonly secret: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly catalog: CatalogService,
    private readonly clock: Clock,
    @InjectRepository(LotImage) private readonly images: Repository<LotImage>,
    @InjectRepository(Lot) private readonly lots: Repository<Lot>,
    config: ConfigService<Env, true>,
    private readonly settlement: SettlementService,
    private readonly timer: SettlementTimer,
    private readonly events: LotEventsService,
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
    let row = await this.detail(id, bidderId, now);
    // Gatilho por acesso: com a API dormindo no Render, o timer não basta.
    if (row.raw.status === 'ended' && row.lot.settledAt === null) {
      await this.trySettle(id);
      row = await this.detail(id, bidderId, now);
    }
    const result = toResult(row);
    const me =
      bidderId === null ? undefined : await this.viewer(id, bidderId, row.raw);
    return toLotDetail(row.lot, row.raw.status, now, { result, me });
  }

  async assertExists(id: number): Promise<void> {
    const exists = await this.lots.exists({
      where: { id, cancelledAt: IsNull() },
    });
    if (!exists) throw new NotFoundException();
  }

  async byNumber(number: number): Promise<LotIdDto> {
    const lot = await this.lots.findOne({
      select: ['id'],
      where: { number, cancelledAt: IsNull() },
    });
    if (!lot) throw new NotFoundException();
    return { id: lot.id };
  }

  async create(
    auctioneerId: number,
    dto: CreateLotDto,
  ): Promise<CreatedLotDto> {
    const conditions = toConditions(dto);
    const fields = scheduleErrors(conditions, this.clock.now());
    if (Object.keys(fields).length > 0) throw validationFailed(fields);

    const artwork = await this.catalog.find(dto.artworkId);
    if (!artwork) throw validationFailed({ artworkId: 'notFound' });
    // Download fora da transação: nada de rede com transação aberta.
    const image = await this.catalog.image(artwork.imageUrl);

    const created = await this.dataSource.transaction((manager) =>
      this.insert(manager, { auctioneerId, artwork, conditions, image }),
    );
    this.timer.refresh();
    return toCreatedLot(created);
  }

  // Lote alheio, inexistente ou já cancelado dá o mesmo 404: não revela que o lote existe.
  async cancel(auctioneerId: number, id: number): Promise<void> {
    const cancelledAt = await this.dataSource.transaction((manager) =>
      this.revoke(manager, auctioneerId, id),
    );
    // Fora da transação: evento só depois do commit, nunca de cancelamento revertido.
    this.events.cancelled(id, { cancelledAt });
  }

  async image(id: number): Promise<ImageFile> {
    const image = await this.images.findOne({
      select: { contentType: true, bytes: true },
      where: { lotId: id },
    });
    if (!image) throw new NotFoundException();
    return { contentType: image.contentType, bytes: image.bytes };
  }

  // Lote travado antes da carteira (D-014); os lances e o selo ficam como estão.
  private async revoke(
    manager: EntityManager,
    auctioneerId: number,
    id: number,
  ): Promise<Date> {
    const lots = manager.getRepository(Lot);
    const lot = await lots.findOne({
      select: { id: true, endsAt: true, seal: true },
      where: { id, auctioneerId, cancelledAt: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!lot) throw new NotFoundException();
    // Depois do lock: um lance que chegou antes já está em bids, e bid_count é só exibição.
    const last = await lastBid(manager, id);
    const now = this.clock.now();
    const { release } = cancellation(
      {
        endsAt: lot.endsAt,
        last: last && { userId: last.userId, amount: last.amount },
      },
      now,
    );
    // Mesma checagem do lance e da liquidação: selo divergente não move saldo (D-064).
    if (lot.seal !== expectedSeal(this.secret, id, last)) {
      throw new DomainException('LOT_INTEGRITY_FAILED');
    }
    if (release) await refund(manager, release);
    await lots.update({ id }, { cancelledAt: now });
    return now;
  }

  private async detail(
    id: number,
    bidderId: number | null,
    now: Date,
  ): Promise<DetailRow> {
    const { entities, raw } = await this.visible(now)
      .select([...DETAIL_COLUMNS, 'settledAt'].map((column) => `lot.${column}`))
      .addSelect(STATUS_SQL, 'status')
      .addSelect(HAS_BID_SQL, 'hasBid')
      .leftJoin(Receipt, 'receipt', 'receipt.lotId = lot.id')
      .addSelect('receipt.alias', 'receiptAlias')
      .addSelect('receipt.amount', 'receiptAmount')
      .addSelect('receipt.token', 'receiptToken')
      .addSelect('receipt.winnerUserId', 'receiptWinnerId')
      .andWhere('lot.id = :id', { id })
      .setParameter('bidderId', bidderId)
      .getRawAndEntities<DetailRaw>();
    if (entities.length === 0) throw new NotFoundException();
    return { lot: entities[0], raw: raw[0] };
  }

  // A liquidação nunca derruba o GET: o erro vai para o log e a resposta sai sem ela.
  private async trySettle(id: number): Promise<void> {
    try {
      await this.settlement.settle(id);
    } catch (error) {
      this.logger.error(`lot ${id} not settled: ${errorMessage(error)}`);
    }
  }

  // Vencedor pelo id, nunca pelo alias: dois licitantes podem colidir nos 30 bits do alias.
  private async viewer(
    id: number,
    bidderId: number,
    raw: DetailRaw,
  ): Promise<LotViewerDto> {
    const alias = forLot(this.secret, bidderId, id);
    const me: LotViewerDto = { alias, hasBid: raw.hasBid };
    if (raw.hasBid) {
      const tops = await bidderTops(this.dataSource.manager, id);
      const position = standing(tops, bidderId);
      if (position) me.standing = position;
    }
    if (raw.receiptToken && raw.receiptWinnerId === bidderId) {
      me.receiptToken = raw.receiptToken;
    }
    return me;
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
  ): Promise<CreatedLotFields> {
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

// Variação somada no banco depois da trava, como na liquidação.
async function refund(
  manager: EntityManager,
  release: Movement,
): Promise<void> {
  const wallets = await lockWallets(manager, [release.userId]);
  await manager.query(
    'UPDATE wallets SET committed = committed - $1 WHERE id = $2',
    [release.amount, walletOf(wallets, release.userId).id],
  );
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

function toResult({ lot, raw }: DetailRow): LotResultDto | null {
  if (lot.settledAt === null) return null;
  return { alias: raw.receiptAlias, amount: raw.receiptAmount };
}
