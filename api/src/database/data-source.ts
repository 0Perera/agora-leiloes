import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { DatabaseEnv, validateEnv } from '../config/env.validation';
import { databaseOptions } from './database.options';

// Usado só pelo CLI do TypeORM. O .env é opcional: no seed contra o Render, as variáveis vêm do shell.
if (existsSync('.env')) process.loadEnvFile();

export default new DataSource(
  databaseOptions(validateEnv(DatabaseEnv, process.env)),
);
