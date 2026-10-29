import type { Lot } from '../lot.entity';
import type { LotStatus } from '../lot-status';

export type DashboardStatus = LotStatus | 'cancelled';

export type DashboardFields = Pick<
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

// Alias, valor e token nulos: lote liquidado sem lances.
export class DashboardResultDto {
  alias!: string | null;
  amount!: number | null;
  receiptToken!: string | null;
}

export class DashboardLotDto {
  id!: number;
  number!: number;
  title!: string;
  artist!: string;
  status!: DashboardStatus;
  startingBid!: number;
  currentBid!: number | null;
  bidCount!: number;
  startsAt!: Date;
  endsAt!: Date;
  result!: DashboardResultDto | null;
}

export function toDashboardLot(
  lot: DashboardFields,
  status: DashboardStatus,
  result: DashboardResultDto | null,
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
    result,
  };
}
