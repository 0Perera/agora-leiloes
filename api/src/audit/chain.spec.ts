import { BidLink, GENESIS, hashBid } from './chain';

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

  it('muda o hash quando dígitos passam de um campo para o vizinho', () => {
    expect(hashBid(SECRET, makeBid({ lotId: 1, seq: 23 }))).not.toBe(
      hashBid(SECRET, makeBid({ lotId: 12, seq: 3 })),
    );
  });
});
