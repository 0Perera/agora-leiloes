import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const MY_BIDS_SECTIONS = ['ongoing', 'won', 'lost'] as const;
export type MyBidsSection = (typeof MY_BIDS_SECTIONS)[number];

export class MyBidsQueryDto {
  @IsOptional()
  @IsIn(MY_BIDS_SECTIONS)
  section: MyBidsSection = 'ongoing';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page: number = 1;
}
