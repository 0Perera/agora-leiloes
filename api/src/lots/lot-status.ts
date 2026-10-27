import type { LotStatus } from './dto/lot-card.dto';

export const STATUS_SQL = `CASE WHEN :now < lot.startsAt THEN 'scheduled' WHEN :now < lot.endsAt THEN 'live' ELSE 'ended' END`;

export const STATUS_WHERE: Record<LotStatus, string> = {
  scheduled: ':now < lot.startsAt',
  live: 'lot.startsAt <= :now AND :now < lot.endsAt',
  ended: 'lot.endsAt <= :now',
};
