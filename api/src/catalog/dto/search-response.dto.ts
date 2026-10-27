import type { CatalogPage } from '../catalog.service';
import { ArtworkResponseDto, toArtworkResponse } from './artwork-response.dto';

export class SearchResponseDto {
  items!: ArtworkResponseDto[];
  page!: number;
  pageSize!: number;
  total!: number;
}

export function toSearchResponse(result: CatalogPage): SearchResponseDto {
  return {
    items: result.items.map(toArtworkResponse),
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  };
}
