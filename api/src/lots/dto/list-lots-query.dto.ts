import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_INT } from '../../common/max-int';
import { PageQueryDto } from '../../common/page-query.dto';
import { trim } from '../../common/trim';
import { LOT_STATUSES, type LotStatus } from '../lot-status';

// Só dígitos: o Number aceitaria "1e3", "0x10" e " 7" como outro número de lote.
function digits({ value }: { value: unknown }): unknown {
  return typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : value;
}

export class ListLotsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(LOT_STATUSES)
  status: LotStatus = 'live';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Transform(digits)
  @IsInt()
  @Min(1)
  @Max(MAX_INT)
  number?: number;
}
