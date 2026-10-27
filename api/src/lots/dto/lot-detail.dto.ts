import type { Lot } from '../lot.entity';
import type { LotStatus } from './lot-card.dto';

export type DetailFields = Pick<
  Lot,
  | 'id'
  | 'number'
  | 'artworkId'
  | 'accessionNumber'
  | 'title'
  | 'artist'
  | 'date'
  | 'type'
  | 'technique'
  | 'measurements'
  | 'description'
  | 'department'
  | 'startingBid'
  | 'increment'
  | 'startsAt'
  | 'endsAt'
  | 'currentBid'
  | 'bidCount'
>;

export class LotViewerDto {
  alias!: string;
  hasBid!: boolean;
}

export class LotDetailDto {
  id!: number;
  number!: number;
  artworkId!: number;
  accessionNumber!: string;
  title!: string;
  artist!: string;
  date!: string;
  type!: string;
  technique!: string;
  measurements!: string;
  description!: string | null;
  department!: string;
  startingBid!: number;
  increment!: number;
  startsAt!: Date;
  endsAt!: Date;
  status!: LotStatus;
  currentBid!: number | null;
  bidCount!: number;
  serverTime!: string;
  me?: LotViewerDto;
}

export function toLotDetail(
  lot: DetailFields,
  status: LotStatus,
  now: Date,
  me?: LotViewerDto,
): LotDetailDto {
  const detail: LotDetailDto = {
    id: lot.id,
    number: lot.number,
    artworkId: lot.artworkId,
    accessionNumber: lot.accessionNumber,
    title: lot.title,
    artist: lot.artist,
    date: lot.date,
    type: lot.type,
    technique: lot.technique,
    measurements: lot.measurements,
    description: lot.description,
    department: lot.department,
    startingBid: lot.startingBid,
    increment: lot.increment,
    startsAt: lot.startsAt,
    endsAt: lot.endsAt,
    status,
    currentBid: lot.currentBid,
    bidCount: lot.bidCount,
    serverTime: now.toISOString(),
  };
  if (me) detail.me = me;
  return detail;
}
