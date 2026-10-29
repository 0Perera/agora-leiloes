import { IsIn, IsOptional } from 'class-validator';
import { PageQueryDto } from '../../common/page-query.dto';

export const MY_BIDS_SECTIONS = ['ongoing', 'won', 'lost'] as const;
export type MyBidsSection = (typeof MY_BIDS_SECTIONS)[number];

export class MyBidsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(MY_BIDS_SECTIONS)
  section: MyBidsSection = 'ongoing';
}
