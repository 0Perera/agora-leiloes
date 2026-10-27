import type { Lot } from '../lot.entity';
import type { LotStatus } from './lot-card.dto';

export type BookStatus = LotStatus | 'cancelled';

export type BookFields = Pick<
  Lot,
  | 'id'
  | 'number'
  | 'title'
  | 'artist'
  | 'startingBid'
  | 'currentBid'
  | 'bidCount'
  | 'startsAt'
  | 'endsAt'
>;

export class DashboardLotDto {
  id!: number;
  number!: number;
  title!: string;
  artist!: string;
  status!: BookStatus;
  startingBid!: number;
  currentBid!: number | null;
  bidCount!: number;
  startsAt!: Date;
  endsAt!: Date;
}

export function toDashboardLot(
  lot: BookFields,
  status: BookStatus,
): DashboardLotDto {
  return {
    id: lot.id,
    number: lot.number,
    title: lot.title,
    artist: lot.artist,
    status,
    startingBid: lot.startingBid,
    currentBid: lot.currentBid,
    bidCount: lot.bidCount,
    startsAt: lot.startsAt,
    endsAt: lot.endsAt,
  };
}
