import { Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { Clock } from '../common/clock';
import { Receipt } from '../receipts/receipt.entity';
import { Bid } from './bid.entity';
import { MyBidsQueryDto, MyBidsSection } from './dto/my-bids-query.dto';
import { MyBidDto, MyBidsCountsDto, MyBidsDto } from './dto/my-bids.dto';

const PAGE_SIZE = 20;

// Vencedor pelo id, nunca pelo alias: dois licitantes podem colidir no alias.
// Lote cancelado nunca é liquidado, então vai para lost e não para won.
const SECTION_WHERE: Record<MyBidsSection, string> = {
  ongoing: 'lot.settledAt IS NULL AND lot.cancelledAt IS NULL',
  won: 'lot.settledAt IS NOT NULL AND receipt.winnerUserId = :userId',
  lost: '((lot.settledAt IS NOT NULL AND receipt.winnerUserId IS DISTINCT FROM :userId) OR lot.cancelledAt IS NOT NULL)',
};

// Situação pelo dono do último lance da cadeia, nunca por current_bid.
const WINNING_SQL =
  '(SELECT last.user_id FROM bids last WHERE last.lot_id = lot.id ORDER BY last.seq DESC LIMIT 1) = :userId';

type Section = {
  select: (builder: SelectQueryBuilder<Bid>) => SelectQueryBuilder<Bid>;
  order: (builder: SelectQueryBuilder<Bid>) => SelectQueryBuilder<Bid>;
};

const SECTIONS: Record<MyBidsSection, Section> = {
  ongoing: {
    select: (builder) =>
      builder
        .addSelect('lot.currentBid', 'currentBid')
        .addSelect('MAX(bid.amount)', 'myBid')
        .addSelect('lot.endsAt', 'endsAt')
        .addSelect(
          `CASE WHEN ${WINNING_SQL} THEN 'winning' ELSE 'outbid' END`,
          'situation',
        )
        .addSelect('lot.endsAt <= :now', 'awaitingSettlement'),
    order: (builder) =>
      builder.orderBy('lot.endsAt', 'ASC').addOrderBy('lot.id', 'ASC'),
  },
  won: {
    select: (builder) =>
      builder
        .addSelect('receipt.amount', 'amount')
        .addSelect('lot.settledAt', 'settledAt')
        .addSelect('receipt.token', 'receiptToken'),
    order: settledOrder,
  },
  lost: {
    select: (builder) =>
      builder
        .addSelect('receipt.amount', 'amount')
        .addSelect('MAX(bid.amount)', 'myBid')
        .addSelect('lot.settledAt', 'settledAt')
        .addSelect('lot.cancelledAt', 'cancelledAt'),
    order: (builder) =>
      builder
        .orderBy('COALESCE(lot.settledAt, lot.cancelledAt)', 'DESC')
        .addOrderBy('lot.id', 'DESC'),
  },
};

function settledOrder(builder: SelectQueryBuilder<Bid>) {
  return builder.orderBy('lot.settledAt', 'DESC').addOrderBy('lot.id', 'DESC');
}

@Injectable()
export class MyBidsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: Clock,
  ) {}

  // Só leitura: lote vencido continua em ongoing até o timer ou um acesso liquidar.
  async list(userId: number, query: MyBidsQueryDto): Promise<MyBidsDto> {
    const section = SECTIONS[query.section];
    const base = this.mine(userId)
      .select('lot.id', 'id')
      .addSelect('lot.number', 'number')
      .addSelect('lot.title', 'title')
      .addSelect('lot.artist', 'artist');
    const items = await section
      .order(section.select(base))
      .andWhere(SECTION_WHERE[query.section])
      .setParameter('now', this.clock.now())
      .groupBy('lot.id')
      .addGroupBy('receipt.id')
      .offset((query.page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .getRawMany<MyBidDto>();
    const counts = await this.counts(userId);
    return {
      section: query.section,
      items,
      page: query.page,
      pageSize: PAGE_SIZE,
      total: counts[query.section],
      counts,
    };
  }

  // Query à parte: COUNT(*) OVER() zeraria o total numa página além do fim.
  private async counts(userId: number): Promise<MyBidsCountsDto> {
    const builder = this.mine(userId);
    for (const name of ['ongoing', 'won', 'lost'] as const) {
      builder.addSelect(
        `COUNT(DISTINCT lot.id) FILTER (WHERE ${SECTION_WHERE[name]})::int`,
        name,
      );
    }
    const row = await builder.getRawOne<MyBidsCountsDto>();
    return row ?? { ongoing: 0, won: 0, lost: 0 };
  }

  // Filtro pelo índice bids_user_id; receipts tem UNIQUE (lot_id) e não duplica linhas.
  private mine(userId: number): SelectQueryBuilder<Bid> {
    return this.dataSource
      .getRepository(Bid)
      .createQueryBuilder('bid')
      .select([])
      .innerJoin('bid.lot', 'lot')
      .leftJoin(Receipt, 'receipt', 'receipt.lotId = lot.id')
      .where('bid.userId = :userId', { userId });
  }
}
