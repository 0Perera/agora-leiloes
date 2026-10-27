import type { Artwork } from '../artwork.mapper';

export class ArtworkResponseDto {
  id!: number;
  title!: string;
  artist!: string;
  date!: string;
  type!: string;
  technique!: string;
  imageUrl!: string;
}

export function toArtworkResponse(artwork: Artwork): ArtworkResponseDto {
  return {
    id: artwork.id,
    title: artwork.title,
    artist: artwork.artist,
    date: artwork.date,
    type: artwork.type,
    technique: artwork.technique,
    imageUrl: artwork.imageUrl,
  };
}
