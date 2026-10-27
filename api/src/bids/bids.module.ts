import { Module } from '@nestjs/common';
import { Clock } from '../common/clock';
import { LotEventsModule } from '../lots/lot-events.module';
import { SettlementModule } from '../settlement/settlement.module';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { MyBidsController } from './my-bids.controller';
import { MyBidsService } from './my-bids.service';

@Module({
  imports: [LotEventsModule, SettlementModule],
  controllers: [BidsController, MyBidsController],
  providers: [BidsService, MyBidsService, Clock],
})
export class BidsModule {}
