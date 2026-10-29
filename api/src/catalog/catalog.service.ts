import { Injectable } from '@nestjs/common';
import { DomainException } from '../common/domain.exception';
import {
  type Artwork,
  type ArtworkDetail,
  toArtworkDetail,
  toArtworkPage,
} from './artwork.mapper';
import { ClevelandClient, type ImageFile } from './cleveland.client';
import { type Department, isDepartment } from './departments';
import { SearchCache } from './search.cache';

const PAGE_SIZE = 12;

export type CatalogSearch = {
  q: string;
  department: Department;
  page: number;
};

export type CatalogPage = {
  items: Artwork[];
  page: number;
  pageSize: number;
  total: number;
};

@Injectable()
export class CatalogService {
  constructor(
    private readonly client: ClevelandClient,
    private readonly cache: SearchCache<CatalogPage>,
  ) {}

  async search({ q, department, page }: CatalogSearch): Promise<CatalogPage> {
    const term = q.toLowerCase();
    const key = JSON.stringify([department, term, page]);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const raw = await this.client.search({
      q: term,
      department,
      limit: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    });
    const parsed = toArtworkPage(raw);
    if (!parsed) throw new DomainException('CATALOG_UNAVAILABLE');

    const result = { ...parsed, page, pageSize: PAGE_SIZE };
    this.cache.set(key, result);
    return result;
  }

  async find(id: number): Promise<ArtworkDetail | null> {
    const raw = await this.client.find(id);
    const artwork = toArtworkDetail(raw);
    if (!artwork || !isDepartment(artwork.department)) return null;
    return artwork;
  }

  image(url: string): Promise<ImageFile> {
    return this.client.download(url);
  }
}
