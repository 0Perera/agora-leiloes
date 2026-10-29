import type { NestExpressApplication } from '@nestjs/platform-express';
import { DomainExceptionFilter } from './common/domain-exception.filter';
import { QueryFailedFilter } from './common/query-failed.filter';
import { validationPipe } from './common/validation.pipe';

// Compartilhado com os testes e2e: a app de teste usa o mesmo pipe e os mesmos filters.
export function setup(app: NestExpressApplication): void {
  // Um proxy na frente (Render): sem isso, req.ip seria sempre o IP do proxy.
  app.set('trust proxy', 1);
  app.useGlobalPipes(validationPipe());
  app.useGlobalFilters(new DomainExceptionFilter(), new QueryFailedFilter());
}
