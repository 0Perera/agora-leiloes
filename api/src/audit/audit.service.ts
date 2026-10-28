import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bid } from '../bids/bid.entity';
import { Clock } from '../common/clock';
import { Env } from '../config/env.validation';
import type { LotStatus } from '../lots/dto/lot-card.dto';
import { STATUS_SQL } from '../lots/lot-status';
import { Lot } from '../lots/lot.entity';
import { Receipt } from '../receipts/receipt.entity';
import { forLot } from './alias';
import { type ChainBid, type ChainReceipt, verify } from './chain';
import { AuditResponseDto } from './dto/audit-response.dto';

type LotRow = {
  id: number;
  number: number;
  title: string;
  status: LotStatus;
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
    @InjectRepository(Lot) private readonly lots: Repository<Lot>,
    @InjectRepository(Bid) private readonly bids: Repository<Bid>,
    private readonly clock: Clock,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('BID_HMAC_SECRET', { infer: true });
  }

  // Só lê: liquidar o lote vencido fica com o GET do lote e o timer.
  async find(id: number): Promise<AuditResponseDto> {
    const lot = await this.lot(id);
    const bids: BidRow[] = await this.bids.find({
      select: ['seq', 'userId', 'amount', 'createdAt', 'prevHash', 'hash'],
      where: { lotId: id },
      order: { seq: 'ASC' },
    });
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

  private async lot(id: number): Promise<LotRow> {
    const row = await this.lots
      .createQueryBuilder('lot')
      .leftJoin(Receipt, 'receipt', 'receipt.lotId = lot.id')
      .select('lot.id', 'id')
      .addSelect('lot.number', 'number')
      .addSelect('lot.title', 'title')
      .addSelect(STATUS_SQL, 'status')
      .addSelect('lot.seal', 'seal')
      .addSelect('lot.settledAt', 'settledAt')
      .addSelect('receipt.alias', 'receiptAlias')
      .addSelect('receipt.amount', 'receiptAmount')
      .addSelect('receipt.finalHash', 'receiptFinalHash')
      .addSelect('receipt.settledAt', 'receiptSettledAt')
      .addSelect('receipt.signature', 'receiptSignature')
      .where('lot.id = :id', { id })
      .andWhere('lot.cancelledAt IS NULL')
      .setParameter('now', this.clock.now())
      .getRawOne<LotRow>();
    if (!row) throw new NotFoundException();
    return row;
  }
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
