import { Module } from '@nestjs/common';
import { Clock } from '../common/clock';
import { LotEventsModule } from '../lots/lot-events.module';
import { SettlementService } from './settlement.service';
import { SettlementTimer } from './settlement.timer';

@Module({
  imports: [LotEventsModule],
  providers: [SettlementService, SettlementTimer, Clock],
  exports: [SettlementService, SettlementTimer],
})
export class SettlementModule {}
