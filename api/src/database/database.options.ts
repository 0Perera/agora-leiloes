import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { DatabaseEnv } from '../config/env.validation';
import { SafeLogger } from './safe.logger';

// Compartilhado entre a aplicação e o CLI de migrations (data-source.ts).
export function databaseOptions(env: DatabaseEnv): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    ssl: env.DB_SSL,
    synchronize: false,
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    // 'schema' é onde o TypeORM loga o andamento das migrations no boot.
    logger: new SafeLogger(['error', 'warn', 'schema', 'migration']),
  };
}
