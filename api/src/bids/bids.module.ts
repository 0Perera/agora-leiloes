import { Module } from '@nestjs/common';
import { Clock } from '../common/clock';
import { LotsModule } from '../lots/lots.module';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';

@Module({
  imports: [LotsModule],
  controllers: [BidsController],
  providers: [BidsService, Clock],
})
export class BidsModule {}
