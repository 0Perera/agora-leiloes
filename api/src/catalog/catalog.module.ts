import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ClevelandClient } from './cleveland.client';
import { SearchCache } from './search.cache';

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    ClevelandClient,
    {
      provide: SearchCache,
      useFactory: () => new SearchCache(TTL_MS, MAX_ENTRIES, Date.now),
    },
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
