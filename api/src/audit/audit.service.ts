import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { Bid } from '../bids/bid.entity';
import { Clock } from '../common/clock';
import { Env } from '../config/env.validation';
import { type LotState, STATE_SQL } from '../lots/lot-status';
import { Lot } from '../lots/lot.entity';
import { Receipt } from '../receipts/receipt.entity';
import { forLot } from './alias';
import { type ChainBid, type ChainReceipt, verify } from './chain';
import { AuditResponseDto } from './dto/audit-response.dto';

type LotRow = {
  id: number;
  number: number;
  title: string;
  artist: string;
  status: LotState;
  seal: string | null;
  settledAt: Date | null;
  receiptAlias: string | null;
  receiptAmount: number | null;
  receiptFinalHash: string | null;
  receiptSettledAt: Date | null;
  receiptSignature: string | null;
};

type BidRow = ChainBid & { userId: number };

@Injectable()
export class AuditService {
  private readonly secret: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly clock: Clock,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('BID_HMAC_SECRET', { infer: true });
  }

  // Só lê: liquidar o lote vencido fica com o GET do lote e o timer.
  async find(id: number): Promise<AuditResponseDto> {
    // Mesmo snapshot nas duas leituras: um lance entre elas daria selo antigo contra lista nova.
    const { lot, bids } = await this.dataSource.transaction(
      'REPEATABLE READ',
      async (manager) => ({
        lot: await this.lot(manager, id),
        bids: await chain(manager, id),
      }),
    );
    const verdict = verify(this.secret, {
      lotId: id,
      seal: lot.seal,
      settled: lot.settledAt !== null,
      bids,
      receipt: toReceipt(lot),
    });
    return {
      id: lot.id,
      number: lot.number,
      title: lot.title,
      artist: lot.artist,
      status: lot.status,
      result: verdict.result,
      brokenSeq: verdict.brokenSeq,
      bids: bids.map((bid, index) => ({
        seq: bid.seq,
        alias: forLot(this.secret, bid.userId, id),
        amount: bid.amount,
        createdAt: bid.createdAt,
        hash: bid.hash,
        mark: verdict.marks[index],
      })),
    };
  }

  private async lot(manager: EntityManager, id: number): Promise<LotRow> {
    const row = await manager
      .getRepository(Lot)
      .createQueryBuilder('lot')
      .leftJoin(Receipt, 'receipt', 'receipt.lotId = lot.id')
      .select('lot.id', 'id')
      .addSelect('lot.number', 'number')
      .addSelect('lot.title', 'title')
      .addSelect('lot.artist', 'artist')
      .addSelect(STATE_SQL, 'status')
      .addSelect('lot.seal', 'seal')
      .addSelect('lot.settledAt', 'settledAt')
      .addSelect('receipt.alias', 'receiptAlias')
      .addSelect('receipt.amount', 'receiptAmount')
      .addSelect('receipt.finalHash', 'receiptFinalHash')
      .addSelect('receipt.settledAt', 'receiptSettledAt')
      .addSelect('receipt.signature', 'receiptSignature')
      .where('lot.id = :id', { id })
      .setParameter('now', this.clock.now())
      .getRawOne<LotRow>();
    if (!row) throw new NotFoundException();
    return row;
  }
}

function chain(manager: EntityManager, lotId: number): Promise<BidRow[]> {
  return manager.getRepository(Bid).find({
    select: ['seq', 'userId', 'amount', 'createdAt', 'prevHash', 'hash'],
    where: { lotId },
    order: { seq: 'ASC' },
  });
}

// Colunas NOT NULL em receipts: o alias nulo só acontece quando o left join não achou comprovante.
function toReceipt(row: LotRow): ChainReceipt | null {
  if (row.receiptAlias === null) return null;
  return {
    alias: row.receiptAlias,
    amount: row.receiptAmount as number,
    finalHash: row.receiptFinalHash as string,
    settledAt: row.receiptSettledAt as Date,
    signature: row.receiptSignature as string,
  };
}
