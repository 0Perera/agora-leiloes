import { createHmac } from 'node:crypto';

import { BidLink, GENESIS, hashBid, sealLot } from './chain';

const SECRET = 'test-secret-with-at-least-32-chars!';

function makeBid(override: Partial<BidLink> = {}): BidLink {
  return {
    lotId: 7,
    seq: 3,
    userId: 42,
    amount: 150_000,
    createdAt: new Date('2026-10-27T12:00:00.123Z'),
    prevHash: 'a'.repeat(64),
    ...override,
  };
}

describe('chain.hashBid', () => {
  it('gera o mesmo hash para o mesmo lance', () => {
    expect(hashBid(SECRET, makeBid())).toBe(hashBid(SECRET, makeBid()));
  });

  it('assina os campos em ordem fixa com prefixo bid:', () => {
    expect(hashBid(SECRET, makeBid())).toBe(
      createHmac('sha256', SECRET)
        .update('bid:7|3|42|150000|2026-10-27T12:00:00.123Z|' + 'a'.repeat(64))
        .digest('hex'),
    );
  });

  it.each<[string, Partial<BidLink>]>([
    ['lotId', { lotId: 8 }],
    ['seq', { seq: 4 }],
    ['userId', { userId: 43 }],
    ['amount', { amount: 150_001 }],
    ['createdAt', { createdAt: new Date('2026-10-27T12:00:00.124Z') }],
    ['prevHash', { prevHash: 'b'.repeat(64) }],
  ])('muda o hash quando muda o campo %s', (_field, override) => {
    expect(hashBid(SECRET, makeBid(override))).not.toBe(
      hashBid(SECRET, makeBid()),
    );
  });

  it('encadeia o primeiro lance com o hash genesis', () => {
    expect(hashBid(SECRET, makeBid({ prevHash: null }))).toBe(
      hashBid(SECRET, makeBid({ prevHash: GENESIS })),
    );
  });

  it('muda o hash quando muda o segredo', () => {
    expect(hashBid(`${SECRET}x`, makeBid())).not.toBe(
      hashBid(SECRET, makeBid()),
    );
  });

  it('não coincide com um selo de mesmo conteúdo', () => {
    const bid = makeBid();
    const rest = `${bid.seq}|${bid.userId}|${bid.amount}|${bid.createdAt.toISOString()}|${bid.prevHash}`;

    expect(hashBid(SECRET, bid)).not.toBe(sealLot(SECRET, bid.lotId, rest));
  });

  it('muda o hash quando dígitos passam de um campo para o vizinho', () => {
    expect(hashBid(SECRET, makeBid({ lotId: 1, seq: 23 }))).not.toBe(
      hashBid(SECRET, makeBid({ lotId: 12, seq: 3 })),
    );
  });
});

describe('chain.sealLot', () => {
  it('muda o selo quando muda a contagem de lances', () => {
    expect(sealLot(SECRET, 3, 'a'.repeat(64))).not.toBe(
      sealLot(SECRET, 2, 'a'.repeat(64)),
    );
  });

  it('muda o selo quando muda o último hash', () => {
    expect(sealLot(SECRET, 3, 'a'.repeat(64))).not.toBe(
      sealLot(SECRET, 3, 'b'.repeat(64)),
    );
  });

  it('selo de lote sem lances usa contagem zero e o hash genesis', () => {
    expect(sealLot(SECRET, 0, null)).toBe(
      createHmac('sha256', SECRET).update(`seal:0|${GENESIS}`).digest('hex'),
    );
  });
});
