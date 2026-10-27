import { Module } from '@nestjs/common';
import { Clock } from '../common/clock';
import { LotEventsModule } from '../lots/lot-events.module';
import { SettlementService } from './settlement.service';

@Module({
  imports: [LotEventsModule],
  providers: [SettlementService, Clock],
  exports: [SettlementService],
})
export class SettlementModule {}
