import { IsInt, Max, Min } from 'class-validator';

export class DepositDto {
  @IsInt()
  @Min(100)
  @Max(1_000_000_000)
  amount!: number;
}
