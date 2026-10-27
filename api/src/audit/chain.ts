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

export type LotSeal = {
  lotId: number;
  count: number;
  lastHash: string | null;
};

// Contagem + último hash detecta lance removido do final; o lotId impede
// copiar o selo de outro lote (D-056).
export function sealLot(secret: string, seal: LotSeal): string {
  return sign(secret, 'seal', [
    seal.lotId,
    seal.count,
    seal.lastHash ?? GENESIS,
  ]);
}

// Selo que o lote deveria ter com o último lance lido; lance e liquidação conferem antes de gravar.
export function expectedSeal(
  secret: string,
  lotId: number,
  last: { seq: number; hash: string } | null,
): string {
  return sealLot(secret, {
    lotId,
    count: last?.seq ?? 0,
    lastHash: last?.hash ?? null,
  });
}
