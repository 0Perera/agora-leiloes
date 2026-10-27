import type { Lot } from '../lot.entity';

export const LOT_STATUSES = ['live', 'scheduled', 'ended'] as const;
export type LotStatus = (typeof LOT_STATUSES)[number];

export type CardFields = Pick<
  Lot,
  | 'id'
  | 'number'
  | 'title'
  | 'artist'
  | 'startingBid'
  | 'currentBid'
  | 'startsAt'
  | 'endsAt'
>;

export class LotCardDto {
  id!: number;
  number!: number;
  title!: string;
  artist!: string;
  startingBid!: number;
  currentBid!: number | null;
  startsAt!: Date;
  endsAt!: Date;
  status!: LotStatus;
}

export function toLotCard(lot: CardFields, status: LotStatus): LotCardDto {
  return {
    id: lot.id,
    number: lot.number,
    title: lot.title,
    artist: lot.artist,
    startingBid: lot.startingBid,
    currentBid: lot.currentBid,
    startsAt: lot.startsAt,
    endsAt: lot.endsAt,
    status,
  };
}
