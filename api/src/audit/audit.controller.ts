import { Controller, Get, Param } from '@nestjs/common';
import { LotIdPipe } from '../lots/lot-id.pipe';
import { AuditService } from './audit.service';
import { AuditResponseDto } from './dto/audit-response.dto';

// Público e sem guard: qualquer pessoa audita o histórico, só com alias.
@Controller('lots')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get(':id/audit')
  find(@Param('id', LotIdPipe) id: number): Promise<AuditResponseDto> {
    return this.audit.find(id);
  }
}
