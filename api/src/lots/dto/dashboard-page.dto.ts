import { DashboardLotDto } from './dashboard-lot.dto';

export class DashboardCountsDto {
  all!: number;
  live!: number;
  scheduled!: number;
  ended!: number;
  cancelled!: number;
}

export class DashboardPageDto {
  items!: DashboardLotDto[];
  page!: number;
  pageSize!: number;
  total!: number;
  counts!: DashboardCountsDto;
}
