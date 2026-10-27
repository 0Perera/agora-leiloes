import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Clock } from '../common/clock';
import { BookCountsDto, DashboardBookDto } from './dto/dashboard-book.dto';
import { Receipt } from '../receipts/receipt.entity';
import {
  BookResultDto,
  BookStatus,
  DashboardLotDto,
  toDashboardLot,
} from './dto/dashboard-lot.dto';
import { BookFilter, DashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { Lot } from './lot.entity';
import { STATUS_SQL, STATUS_WHERE } from './lot-status';

const PAGE_SIZE = 20;

const BOOK_SQL = `CASE WHEN lot.cancelledAt IS NOT NULL THEN 'cancelled' ELSE ${STATUS_SQL} END`;

const BOOK_WHERE: Record<BookFilter, string> = {
  all: 'TRUE',
  live: `lot.cancelledAt IS NULL AND ${STATUS_WHERE.live}`,
  scheduled: `lot.cancelledAt IS NULL AND ${STATUS_WHERE.scheduled}`,
  ended: `lot.cancelledAt IS NULL AND ${STATUS_WHERE.ended}`,
  cancelled: 'lot.cancelledAt IS NOT NULL',
};

const BOOK_COLUMNS = [
  'id',
  'number',
  'title',
  'artist',
  'startingBid',
  'currentBid',
  'bidCount',
  'startsAt',
  'endsAt',
  'settledAt',
] as const;

type BookRaw = {
  status: BookStatus;
  receiptAlias: string | null;
  receiptAmount: number | null;
  receiptToken: string | null;
};

type SummaryRow = {
  liveCount: number;
  currentBidTotal: string | null;
  scheduledCount: number;
  nextStartsAt: Date | null;
  endedCount: number;
  withoutBids: number;
  received: string | null;
};

const EMPTY_SUMMARY: SummaryRow = {
  liveCount: 0,
  currentBidTotal: null,
  scheduledCount: 0,
  nextStartsAt: null,
  endedCount: 0,
  withoutBids: 0,
  received: null,
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly clock: Clock,
    @InjectRepository(Lot) private readonly lots: Repository<Lot>,
  ) {}

  async book(
    auctioneerId: number,
    query: DashboardQueryDto,
  ): Promise<DashboardBookDto> {
    const now = this.clock.now();
    const { entities, raw } = await this.own(auctioneerId, now)
      .select(BOOK_COLUMNS.map((column) => `lot.${column}`))
      .addSelect(BOOK_SQL, 'status')
      .leftJoin(Receipt, 'receipt', 'receipt.lotId = lot.id')
      .addSelect('receipt.alias', 'receiptAlias')
      .addSelect('receipt.amount', 'receiptAmount')
      .addSelect('receipt.token', 'receiptToken')
      .andWhere(BOOK_WHERE[query.status])
      .orderBy('lot.number', 'DESC')
      .offset((query.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .getRawAndEntities<BookRaw>();
    const counts = await this.counts(auctioneerId, now);
    const items: DashboardLotDto[] = entities.map((lot, index) =>
      toDashboardLot(lot, raw[index].status, toResult(lot, raw[index])),
    );
    return {
      items,
      page: query.page,
      pageSize: PAGE_SIZE,
      total: counts[query.status],
      counts,
    };
  }

  async summary(auctioneerId: number): Promise<DashboardSummaryDto> {
    const row = await this.own(auctioneerId, this.clock.now())
      .andWhere('lot.cancelledAt IS NULL')
      .select(`COUNT(*) FILTER (WHERE ${STATUS_WHERE.live})::int`, 'liveCount')
      .addSelect(
        `SUM(lot.currentBid) FILTER (WHERE ${STATUS_WHERE.live})`,
        'currentBidTotal',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE ${STATUS_WHERE.scheduled})::int`,
        'scheduledCount',
      )
      .addSelect(
        `MIN(lot.startsAt) FILTER (WHERE ${STATUS_WHERE.scheduled})`,
        'nextStartsAt',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE ${STATUS_WHERE.ended})::int`,
        'endedCount',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE ${STATUS_WHERE.ended} AND lot.bidCount = 0)::int`,
        'withoutBids',
      )
      .leftJoin(Receipt, 'receipt', 'receipt.lotId = lot.id')
      .addSelect('SUM(receipt.amount)', 'received')
      .getRawOne<SummaryRow>();
    return toSummary(row);
  }

  private async counts(
    auctioneerId: number,
    now: Date,
  ): Promise<BookCountsDto> {
    const builder = this.own(auctioneerId, now).select('COUNT(*)::int', 'all');
    for (const status of ['live', 'scheduled', 'ended', 'cancelled'] as const) {
      builder.addSelect(
        `COUNT(*) FILTER (WHERE ${BOOK_WHERE[status]})::int`,
        status,
      );
    }
    const row = await builder.getRawOne<BookCountsDto>();
    return row ?? { all: 0, live: 0, scheduled: 0, ended: 0, cancelled: 0 };
  }

  private own(auctioneerId: number, now: Date): SelectQueryBuilder<Lot> {
    return this.lots
      .createQueryBuilder('lot')
      .where('lot.auctioneerId = :auctioneerId', { auctioneerId })
      .setParameter('now', now);
  }
}

// SUM de integer volta como bigint, que o driver entrega em string; cabe com folga em 2^53.
function toSummary(row: SummaryRow = EMPTY_SUMMARY): DashboardSummaryDto {
  return {
    live: {
      count: row.liveCount,
      currentBidTotal: Number(row.currentBidTotal ?? 0),
    },
    scheduled: { count: row.scheduledCount, nextStartsAt: row.nextStartsAt },
    ended: { count: row.endedCount, withoutBids: row.withoutBids },
    received: Number(row.received ?? 0),
  };
}

// Nulo enquanto não liquidado; liquidado sem lances não tem comprovante e sai com nulos.
function toResult(
  lot: Pick<Lot, 'settledAt'>,
  raw: BookRaw,
): BookResultDto | null {
  if (lot.settledAt === null) return null;
  return {
    alias: raw.receiptAlias,
    amount: raw.receiptAmount,
    receiptToken: raw.receiptToken,
  };
}
