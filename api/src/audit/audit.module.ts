import { Module } from '@nestjs/common';
import { Clock } from '../common/clock';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, Clock],
})
export class AuditModule {}
