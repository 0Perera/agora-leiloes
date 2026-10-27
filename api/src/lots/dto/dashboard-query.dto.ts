import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const BOOK_FILTERS = [
  'all',
  'live',
  'scheduled',
  'ended',
  'cancelled',
] as const;
export type BookFilter = (typeof BOOK_FILTERS)[number];

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(BOOK_FILTERS)
  status: BookFilter = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page: number = 1;
}
