import type { Lot } from '../lot.entity';

export class LotResponseDto {
  id!: number;
  number!: number;
  title!: string;
  artist!: string;
  startingBid!: number;
  increment!: number;
  startsAt!: Date;
  endsAt!: Date;
}

export type CreatedLot = Pick<
  Lot,
  | 'id'
  | 'number'
  | 'title'
  | 'artist'
  | 'startingBid'
  | 'increment'
  | 'startsAt'
  | 'endsAt'
>;

export function toLotResponse(lot: CreatedLot): LotResponseDto {
  return {
    id: lot.id,
    number: lot.number,
    title: lot.title,
    artist: lot.artist,
    startingBid: lot.startingBid,
    increment: lot.increment,
    startsAt: lot.startsAt,
    endsAt: lot.endsAt,
  };
}
