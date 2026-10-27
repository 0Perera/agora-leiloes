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
  // Só para o vencedor: o link do comprovante não é exibido aos demais.
  receiptToken?: string;
}

// Alias e valor nulos: lote liquidado sem lances.
export class LotResultDto {
  alias!: string | null;
  amount!: number | null;
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
  result!: LotResultDto | null;
  me?: LotViewerDto;
}

export type DetailExtras = { result: LotResultDto | null; me?: LotViewerDto };

export function toLotDetail(
  lot: DetailFields,
  status: LotStatus,
  now: Date,
  { result, me }: DetailExtras,
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
    result,
  };
  if (me) detail.me = me;
  return detail;
}
