import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../common/domain.exception';
import type { Env } from '../config/env.validation';
import type { Department } from './departments';

const TIMEOUT_MS = 5000;
const SEARCH_FIELDS =
  'id,title,creators,culture,creation_date,type,technique,images';
const DETAIL_FIELDS = `${SEARCH_FIELDS},accession_number,measurements,did_you_know,description,department`;
// SVG fica de fora: seria servido do nosso domínio e pode carregar script.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageFile = {
  contentType: string;
  bytes: Buffer;
};

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

  async download(url: string): Promise<ImageFile> {
    if (!url.startsWith('https://')) throw imageFailed();
    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: IMAGE_TYPES.join(',') },
      });
    } catch {
      throw imageFailed();
    }
    const contentType = imageType(response);
    if (!contentType || !response.body) {
      await response.body?.cancel().catch(() => undefined);
      throw imageFailed();
    }
    return { contentType, bytes: await readLimited(response.body) };
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

function imageFailed(): DomainException {
  return new DomainException('IMAGE_DOWNLOAD_FAILED');
}

function imageType(response: Response): string | null {
  if (!response.ok) return null;
  const declared = Number(response.headers.get('content-length'));
  if (declared > MAX_IMAGE_BYTES) return null;
  const type = response.headers
    .get('content-type')
    ?.split(';')[0]
    .trim()
    .toLowerCase();
  return type && IMAGE_TYPES.includes(type) ? type : null;
}

// O content-length pode faltar ou mentir: o limite vale para os bytes lidos.
async function readLimited(body: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) throw imageFailed();
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    throw imageFailed();
  }
  if (total === 0) throw imageFailed();
  return Buffer.concat(chunks);
}
