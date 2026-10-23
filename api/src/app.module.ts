import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Env, validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => validateEnv(Env, config),
    }),
    DatabaseModule,
  ],
})
export class AppModule {}
