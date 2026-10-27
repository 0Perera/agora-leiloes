import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Auth } from '../common/auth.decorator';
import type { AuthUser } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { LotIdPipe } from '../lots/lot-id.pipe';
import { BidHistoryQueryDto } from './dto/bid-history-query.dto';
import { BidHistoryDto } from './dto/bid-history.dto';
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

  @Get(':id/bids')
  history(
    @Param('id', LotIdPipe) id: number,
    @Query() query: BidHistoryQueryDto,
  ): Promise<BidHistoryDto> {
    return this.bids.history(id, query.page);
  }
}
