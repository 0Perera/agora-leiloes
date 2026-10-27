import { INestApplication } from '@nestjs/common';
import { DomainExceptionFilter } from './common/domain-exception.filter';
import { QueryFailedFilter } from './common/query-failed.filter';
import { validationPipe } from './common/validation.pipe';

// Compartilhado com os testes e2e: a app de teste usa o mesmo pipe e os mesmos filters.
export function setup(app: INestApplication): void {
  app.useGlobalPipes(validationPipe());
  app.useGlobalFilters(new DomainExceptionFilter(), new QueryFailedFilter());
}
