import { DashboardLotDto } from './dashboard-lot.dto';

export class BookCountsDto {
  all!: number;
  live!: number;
  scheduled!: number;
  ended!: number;
  cancelled!: number;
}

export class DashboardBookDto {
  items!: DashboardLotDto[];
  page!: number;
  pageSize!: number;
  total!: number;
  counts!: BookCountsDto;
}
