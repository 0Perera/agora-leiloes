import type { LotStatus } from '../../lots/dto/lot-card.dto';
import type { AuditResult, BidMark } from '../chain';

export class AuditBidDto {
  seq!: number;
  alias!: string;
  amount!: number;
  createdAt!: Date;
  hash!: string;
  mark!: BidMark;
}

export class AuditResponseDto {
  id!: number;
  number!: number;
  title!: string;
  artist!: string;
  status!: LotStatus;
  result!: AuditResult;
  brokenSeq!: number | null;
  bids!: AuditBidDto[];
}
