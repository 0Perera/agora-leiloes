import type { Lot } from '../lot.entity';
import type { LotStatus } from '../lot-status';

export type CardFields = Pick<
  Lot,
  | 'id'
  | 'number'
  | 'artworkId'
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
  artworkId!: number;
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
    artworkId: lot.artworkId,
    title: lot.title,
    artist: lot.artist,
    startingBid: lot.startingBid,
    currentBid: lot.currentBid,
    startsAt: lot.startsAt,
    endsAt: lot.endsAt,
    status,
  };
}
