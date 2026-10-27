import { IsInt, IsISO8601, Max, Min } from 'class-validator';

export class CreateLotDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
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
