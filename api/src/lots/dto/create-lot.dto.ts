import { IsInt, IsISO8601, Max, Min } from 'class-validator';
import { MAX_INT } from '../../common/max-int';

export class CreateLotDto {
  @IsInt()
  @Min(1)
  @Max(MAX_INT)
  artworkId!: number;

  @IsInt()
  @Min(100)
  @Max(1_000_000_000)
  startingBid!: number;

  @IsInt()
  @Min(100)
  @Max(100_000_000)
  increment!: number;

  @IsISO8601({ strict: true })
  startsAt!: string;

  @IsISO8601({ strict: true })
  endsAt!: string;
}
