import { IsInt, Max, Min } from 'class-validator';
import { MAX_INT } from '../../common/max-int';

export class PlaceBidDto {
  @IsInt()
  @Min(1)
  @Max(MAX_INT)
  amount!: number;
}
