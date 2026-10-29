import { IsIn, IsOptional } from 'class-validator';
import { PageQueryDto } from '../../common/page-query.dto';

export const DASHBOARD_FILTERS = [
  'all',
  'live',
  'scheduled',
  'ended',
  'cancelled',
] as const;
export type DashboardFilter = (typeof DASHBOARD_FILTERS)[number];

export class DashboardQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(DASHBOARD_FILTERS)
  status: DashboardFilter = 'all';
}
