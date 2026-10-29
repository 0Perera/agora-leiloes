import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PageQueryDto } from '../../common/page-query.dto';
import { trim } from '../../common/trim';
import {
  DEFAULT_DEPARTMENT,
  DEPARTMENTS,
  type Department,
} from '../departments';

export class SearchQueryDto extends PageQueryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q!: string;

  @IsOptional()
  @IsIn(DEPARTMENTS)
  department: Department = DEFAULT_DEPARTMENT;
}
