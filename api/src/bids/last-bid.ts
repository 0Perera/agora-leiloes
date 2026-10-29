import { EntityManager } from 'typeorm';
import { Bid } from './bid.entity';

export type LastBid = Pick<Bid, 'seq' | 'userId' | 'amount' | 'hash'>;

// Liderança, mínimo, vencedor e valor saem do último lance da cadeia, nunca de
// current_bid: a cópia no lote pode divergir de bids sem que nada acuse (D-042).
export function lastBid(
  manager: EntityManager,
  lotId: number,
): Promise<LastBid | null> {
  return manager.getRepository(Bid).findOne({
    select: { seq: true, userId: true, amount: true, hash: true },
    where: { lotId },
    order: { seq: 'DESC' },
  });
}
