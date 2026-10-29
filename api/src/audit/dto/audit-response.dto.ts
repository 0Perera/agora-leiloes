import type { LotState } from '../../lots/lot-status';
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
  status!: LotState;
  result!: AuditResult;
  brokenSeq!: number | null;
  bids!: AuditBidDto[];
}
