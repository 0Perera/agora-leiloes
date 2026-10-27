import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../common/domain.exception';
import type { Env } from '../config/env.validation';
import type { Department } from './departments';

const TIMEOUT_MS = 5000;
const SEARCH_FIELDS =
  'id,title,creators,culture,creation_date,type,technique,images';
const DETAIL_FIELDS = `${SEARCH_FIELDS},accession_number,measurements,did_you_know,description,department`;

export type ClevelandSearch = {
  q: string;
  department: Department;
  limit: number;
  skip: number;
};

@Injectable()
export class ClevelandClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config
      .get('CLEVELAND_API_URL', { infer: true })
      .replace(/\/+$/, '');
  }

  async search(search: ClevelandSearch): Promise<unknown> {
    const params = new URLSearchParams({
      q: search.q,
      department: search.department,
      limit: String(search.limit),
      skip: String(search.skip),
      has_image: '1',
      fields: SEARCH_FIELDS,
    });
    const body = await this.get(`/artworks/?${params.toString()}`);
    if (body === null) throw new DomainException('CATALOG_UNAVAILABLE');
    return body;
  }

  async find(id: number): Promise<unknown> {
    const params = new URLSearchParams({ fields: DETAIL_FIELDS });
    const body = await this.get(`/artworks/${id}?${params.toString()}`);
    if (body === null) return null;
    if (typeof body !== 'object' || !('data' in body)) {
      throw new DomainException('CATALOG_UNAVAILABLE');
    }
    return body.data;
  }

  private async get(path: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: 'application/json' },
      });
    } catch {
      throw new DomainException('CATALOG_UNAVAILABLE');
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      if (response.status === 404) return null;
      throw new DomainException('CATALOG_UNAVAILABLE');
    }
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new DomainException('CATALOG_UNAVAILABLE');
    }
  }
}
