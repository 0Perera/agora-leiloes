import type { Lot } from '../lot.entity';

export class CreatedLotDto {
  id!: number;
  number!: number;
  artworkId!: number;
  title!: string;
  artist!: string;
  startingBid!: number;
  increment!: number;
  startsAt!: Date;
  endsAt!: Date;
}

export type CreatedLotFields = Pick<
  Lot,
  | 'id'
  | 'number'
  | 'artworkId'
  | 'title'
  | 'artist'
  | 'startingBid'
  | 'increment'
  | 'startsAt'
  | 'endsAt'
>;

export function toCreatedLot(lot: CreatedLotFields): CreatedLotDto {
  return {
    id: lot.id,
    number: lot.number,
    artworkId: lot.artworkId,
    title: lot.title,
    artist: lot.artist,
    startingBid: lot.startingBid,
    increment: lot.increment,
    startsAt: lot.startsAt,
    endsAt: lot.endsAt,
  };
}
