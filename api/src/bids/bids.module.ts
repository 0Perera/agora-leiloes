import { Module } from '@nestjs/common';
import { Clock } from '../common/clock';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';

@Module({
  controllers: [BidsController],
  providers: [BidsService, Clock],
})
export class BidsModule {}
