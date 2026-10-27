import { createHmac } from 'node:crypto';

export const GENESIS = '0'.repeat(64);

export type BidLink = {
  lotId: number;
  seq: number;
  userId: number;
  amount: number;
  createdAt: Date;
  prevHash: string | null;
};

export type SignPrefix = 'bid' | 'seal' | 'alias' | 'receipt';

// Prefixo de domínio: uma assinatura de um contexto nunca vale em outro (D-056).
export function sign(
  secret: string,
  prefix: SignPrefix,
  fields: (string | number)[],
): string {
  return createHmac('sha256', secret)
    .update(`${prefix}:${fields.join('|')}`)
    .digest('hex');
}

export function hashBid(secret: string, bid: BidLink): string {
  return sign(secret, 'bid', [
    bid.lotId,
    bid.seq,
    bid.userId,
    bid.amount,
    bid.createdAt.toISOString(),
    bid.prevHash ?? GENESIS,
  ]);
}

// Contagem + último hash detecta lance removido do final da cadeia.
export function sealLot(
  secret: string,
  count: number,
  lastHash: string | null,
): string {
  return sign(secret, 'seal', [count, lastHash ?? GENESIS]);
}
