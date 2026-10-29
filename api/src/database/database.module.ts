import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { Env } from '../config/env.validation';
import { databaseOptions } from './database.options';

// migrationsRun: o Render free não tem pre-deploy, então as migrations rodam no boot (D-031).
export function databaseFactory(
  config: ConfigService<Env, true>,
): PostgresConnectionOptions {
  return {
    ...databaseOptions({
      DATABASE_URL: config.get('DATABASE_URL', { infer: true }),
      DB_SSL: config.get('DB_SSL', { infer: true }),
      DB_LOG_QUERIES: config.get('DB_LOG_QUERIES', { infer: true }),
    }),
    migrationsRun: true,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseFactory,
    }),
  ],
})
export class DatabaseModule {}
