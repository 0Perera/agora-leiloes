import { Module } from '@nestjs/common';
import { LotEventsService } from './lot-events.service';

// Módulo próprio: lotes, lances e liquidação publicam no stream sem importar uns aos outros.
@Module({
  providers: [LotEventsService],
  exports: [LotEventsService],
})
export class LotEventsModule {}
