import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bid } from '../bids/bid.entity';
import { Clock } from '../common/clock';
import { Lot } from '../lots/lot.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lot, Bid])],
  controllers: [AuditController],
  providers: [AuditService, Clock],
})
export class AuditModule {}
