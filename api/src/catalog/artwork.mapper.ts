export type Artwork = {
  id: number;
  title: string;
  artist: string;
  date: string;
  type: string;
  technique: string;
  imageUrl: string;
};

export type ArtworkDetail = Artwork & {
  accessionNumber: string;
  measurements: string;
  description: string | null;
  department: string;
};

export type ArtworkPage = {
  items: Artwork[];
  total: number;
};

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : undefined;
}

function imageUrl(raw: Raw): string {
  const images = raw.images;
  if (!isRecord(images) || !isRecord(images.web)) return '';
  return text(images.web.url);
}

// Peças antigas costumam vir sem creators: culture é o fallback.
function artist(raw: Raw): string {
  const creator = first(raw.creators);
  const fromCreator = isRecord(creator) ? text(creator.description) : '';
  return fromCreator || text(first(raw.culture));
}

export function toArtwork(raw: unknown): Artwork | null {
  if (!isRecord(raw) || typeof raw.id !== 'number') return null;
  const title = text(raw.title);
  const image = imageUrl(raw);
  if (!title || !image) return null;
  return {
    id: raw.id,
    title,
    artist: artist(raw),
    date: text(raw.creation_date),
    type: text(raw.type),
    technique: text(raw.technique),
    imageUrl: image,
  };
}

export function toArtworkDetail(raw: unknown): ArtworkDetail | null {
  const artwork = toArtwork(raw);
  if (!artwork || !isRecord(raw)) return null;
  return {
    ...artwork,
    accessionNumber: text(raw.accession_number),
    measurements: text(raw.measurements),
    description: text(raw.did_you_know) || text(raw.description) || null,
    department: text(raw.department),
  };
}

export function toArtworkPage(raw: unknown): ArtworkPage | null {
  if (!isRecord(raw) || !Array.isArray(raw.data)) return null;
  const total = isRecord(raw.info) ? raw.info.total : undefined;
  return {
    items: raw.data
      .map(toArtwork)
      .filter((item): item is Artwork => item !== null),
    total: typeof total === 'number' ? total : 0,
  };
}
