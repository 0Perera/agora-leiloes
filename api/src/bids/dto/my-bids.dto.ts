import type { MyBidsSection } from './my-bids-query.dto';

export type Situation = 'winning' | 'outbid';

export class OngoingBidDto {
  id!: number;
  number!: number;
  title!: string;
  artist!: string;
  currentBid!: number | null;
  myBid!: number;
  endsAt!: Date;
  situation!: Situation;
  // Encerrado e ainda não liquidado: fica aqui até o timer ou um acesso liquidar.
  awaitingSettlement!: boolean;
}

export class WonBidDto {
  id!: number;
  number!: number;
  title!: string;
  artist!: string;
  amount!: number;
  settledAt!: Date;
  receiptToken!: string;
}

// Valor nulo só num liquidado sem comprovante, que não deveria existir.
export class LostBidDto {
  id!: number;
  number!: number;
  title!: string;
  artist!: string;
  amount!: number | null;
  myBid!: number;
  settledAt!: Date;
}

export type MyBidDto = OngoingBidDto | WonBidDto | LostBidDto;

export class MyBidsCountsDto {
  ongoing!: number;
  won!: number;
  lost!: number;
}

export class MyBidsDto {
  section!: MyBidsSection;
  items!: MyBidDto[];
  page!: number;
  pageSize!: number;
  total!: number;
  counts!: MyBidsCountsDto;
}
