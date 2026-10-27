import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { Clock } from '../common/clock';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { LotEventsModule } from './lot-events.module';
import { LotImage } from './lot-image.entity';
import { Lot } from './lot.entity';
import { LotsController } from './lots.controller';
import { LotsService } from './lots.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lot, LotImage]),
    CatalogModule,
    LotEventsModule,
  ],
  controllers: [LotsController, DashboardController],
  providers: [LotsService, DashboardService, Clock],
})
export class LotsModule {}
