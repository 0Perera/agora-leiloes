import { IsInt, Max, Min } from 'class-validator';

export class PlaceBidDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  amount!: number;
}
