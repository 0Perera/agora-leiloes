import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Env } from '../config/env.validation';
import { ReceiptResponseDto } from './dto/receipt-response.dto';
import { Receipt } from './receipt.entity';
import { verifyReceipt } from './receipt.signature';

type ReceiptRow = Omit<ReceiptResponseDto, 'valid'> & { signature: string };

@Injectable()
export class ReceiptsService {
  private readonly secret: string;

  constructor(
    @InjectRepository(Receipt) private readonly receipts: Repository<Receipt>,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('BID_HMAC_SECRET', { infer: true });
  }

  // Adulterado também sai, com valid: false e os dados como estão no banco.
  async find(token: string): Promise<ReceiptResponseDto> {
    const row = await this.receipts
      .createQueryBuilder('receipt')
      .innerJoin('receipt.lot', 'lot')
      .select('receipt.lotId', 'lotId')
      .addSelect('lot.number', 'number')
      .addSelect('lot.artworkId', 'artworkId')
      .addSelect('lot.title', 'title')
      .addSelect('lot.artist', 'artist')
      .addSelect('receipt.amount', 'amount')
      .addSelect('receipt.alias', 'alias')
      .addSelect('receipt.settledAt', 'settledAt')
      .addSelect('receipt.finalHash', 'finalHash')
      .addSelect('receipt.signature', 'signature')
      .where('receipt.token = :token', { token })
      .getRawOne<ReceiptRow>();
    if (!row) throw new NotFoundException();
    const { signature, ...receipt } = row;
    return {
      ...receipt,
      valid: verifyReceipt(this.secret, receipt, signature),
    };
  }
}
