export const LOT_STATUSES = ['live', 'scheduled', 'ended'] as const;
export type LotStatus = (typeof LOT_STATUSES)[number];

export const STATUS_SQL = `CASE WHEN :now < lot.startsAt THEN 'scheduled' WHEN :now < lot.endsAt THEN 'live' ELSE 'ended' END`;

export const STATUS_WHERE: Record<LotStatus, string> = {
  scheduled: ':now < lot.startsAt',
  live: 'lot.startsAt <= :now AND :now < lot.endsAt',
  ended: 'lot.endsAt <= :now',
};

// Cancelamento é coluna, não é calculado: entra antes do status por datas.
export type LotState = LotStatus | 'cancelled';

export const STATE_SQL = `CASE WHEN lot.cancelledAt IS NOT NULL THEN 'cancelled' ELSE ${STATUS_SQL} END`;
