import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { Clock } from '../common/clock';
import { LotImage } from './lot-image.entity';
import { LotsController } from './lots.controller';
import { LotsService } from './lots.service';

@Module({
  imports: [TypeOrmModule.forFeature([LotImage]), CatalogModule],
  controllers: [LotsController],
  providers: [LotsService, Clock],
})
export class LotsModule {}
