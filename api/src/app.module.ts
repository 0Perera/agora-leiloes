import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BidsModule } from './bids/bids.module';
import { CatalogModule } from './catalog/catalog.module';
import { Env, validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LotsModule } from './lots/lots.module';
import { SettlementModule } from './settlement/settlement.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => validateEnv(Env, config),
    }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    WalletsModule,
    CatalogModule,
    LotsModule,
    BidsModule,
    SettlementModule,
  ],
})
export class AppModule {}
