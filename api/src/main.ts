import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setup } from './app.setup';
import { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }) });
  setup(app);
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
