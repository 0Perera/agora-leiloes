import { Module } from '@nestjs/common';
import { Clock } from '../common/clock';
import { LotEventsModule } from '../lots/lot-events.module';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';

@Module({
  imports: [LotEventsModule],
  controllers: [BidsController],
  providers: [BidsService, Clock],
})
export class BidsModule {}
