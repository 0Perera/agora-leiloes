import { EntityManager } from 'typeorm';
import { Bid } from './bid.entity';
import type { BidderTop } from './standing.rules';

// Maior lance de cada licitante lido de bids, nunca de current_bid (D-042).
export function bidderTops(
  manager: EntityManager,
  lotId: number,
): Promise<BidderTop[]> {
  return manager
    .getRepository(Bid)
    .createQueryBuilder('bid')
    .select('bid.userId', 'userId')
    .addSelect('MAX(bid.amount)::int', 'highest')
    .where('bid.lotId = :lotId', { lotId })
    .groupBy('bid.userId')
    .getRawMany<BidderTop>();
}
