import { Body, Controller, Param, Post } from '@nestjs/common';
import { Auth } from '../common/auth.decorator';
import type { AuthUser } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { LotIdPipe } from '../lots/lot-id.pipe';
import { BidResponseDto } from './dto/bid-response.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import { BidsService } from './bids.service';

@Controller('lots')
export class BidsController {
  constructor(private readonly bids: BidsService) {}

  @Post(':id/bids')
  @Auth('BIDDER')
  place(
    @CurrentUser() user: AuthUser,
    @Param('id', LotIdPipe) id: number,
    @Body() dto: PlaceBidDto,
  ): Promise<BidResponseDto> {
    return this.bids.place(user.id, id, dto.amount);
  }
}
