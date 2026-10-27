import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LOT_STATUSES, type LotStatus } from './lot-card.dto';

const MAX_NUMBER = 2_147_483_647;

// Só dígitos: o Number aceitaria "1e3", "0x10" e " 7" como outro número de lote.
function digits({ value }: { value: unknown }): unknown {
  return typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value)
    : value;
}

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ListLotsQueryDto {
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
  @Max(MAX_NUMBER)
  number?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page: number = 1;
}
