import { IsInt, Max, Min } from 'class-validator';

export class DepositDto {
  @IsInt()
  @Min(100)
  @Max(10_000_000)
  amount!: number;
}
