import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/domain-exception.filter';
import { QueryFailedFilter } from './common/query-failed.filter';
import { validationPipe } from './common/validation.pipe';
import { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }) });
  app.useGlobalPipes(validationPipe());
  app.useGlobalFilters(new DomainExceptionFilter(), new QueryFailedFilter());
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
