import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../common/auth.decorator';
import type { AuthUser } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { MyBidsQueryDto } from './dto/my-bids-query.dto';
import { MyBidsDto } from './dto/my-bids.dto';
import { MyBidsService } from './my-bids.service';

@Controller('my-bids')
@Auth('BIDDER')
export class MyBidsController {
  constructor(private readonly myBids: MyBidsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: MyBidsQueryDto,
  ): Promise<MyBidsDto> {
    return this.myBids.list(user.id, query);
  }
}
