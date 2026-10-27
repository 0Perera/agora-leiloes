import { LotCardDto } from './lot-card.dto';

export class LotCountsDto {
  live!: number;
  scheduled!: number;
  ended!: number;
}

export class LotShowcaseDto {
  items!: LotCardDto[];
  page!: number;
  pageSize!: number;
  total!: number;
  counts!: LotCountsDto;
}
