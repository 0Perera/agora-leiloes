import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../common/auth.decorator';
import type { AuthUser } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardPageDto } from './dto/dashboard-page.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

@Controller('dashboard')
@Auth('AUCTIONEER')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('lots')
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardPageDto> {
    return this.dashboard.list(user.id, query);
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthUser): Promise<DashboardSummaryDto> {
    return this.dashboard.summary(user.id);
  }
}
