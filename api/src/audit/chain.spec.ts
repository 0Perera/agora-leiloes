import { createHmac } from 'node:crypto';

import { sign as signReceipt } from '../receipts/receipt.signature';
import {
  AuditInput,
  BidLink,
  ChainBid,
  ChainReceipt,
  expectedSeal,
  GENESIS,
  hashBid,
  LotSeal,
  sealLot,
  verify,
} from './chain';

const SECRET = 'test-secret-with-at-least-32-chars!';
const LOT = 7;
const FORGED = 'f'.repeat(64);

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

function makeSeal(override: Partial<LotSeal> = {}): LotSeal {
  return { lotId: 7, count: 3, lastHash: 'a'.repeat(64), ...override };
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
    const rest = `${bid.userId}|${bid.amount}|${bid.createdAt.toISOString()}|${bid.prevHash}`;

    expect(hashBid(SECRET, bid)).not.toBe(
      sealLot(SECRET, { lotId: bid.lotId, count: bid.seq, lastHash: rest }),
    );
  });

  it('muda o hash quando dígitos passam de um campo para o vizinho', () => {
    expect(hashBid(SECRET, makeBid({ lotId: 1, seq: 23 }))).not.toBe(
      hashBid(SECRET, makeBid({ lotId: 12, seq: 3 })),
    );
  });
});

describe('chain.sealLot', () => {
  it('muda o selo quando muda a contagem de lances', () => {
    expect(sealLot(SECRET, makeSeal({ count: 2 }))).not.toBe(
      sealLot(SECRET, makeSeal()),
    );
  });

  it('muda o selo quando muda o último hash', () => {
    expect(sealLot(SECRET, makeSeal({ lastHash: 'b'.repeat(64) }))).not.toBe(
      sealLot(SECRET, makeSeal()),
    );
  });

  it('selo de lote sem lances usa contagem zero e o hash genesis', () => {
    expect(sealLot(SECRET, makeSeal({ count: 0, lastHash: null }))).toBe(
      createHmac('sha256', SECRET).update(`seal:7|0|${GENESIS}`).digest('hex'),
    );
  });

  it('selos de lotes diferentes sem lances não coincidem', () => {
    const empty = { count: 0, lastHash: null };

    expect(sealLot(SECRET, makeSeal({ ...empty, lotId: 8 }))).not.toBe(
      sealLot(SECRET, makeSeal(empty)),
    );
  });

  it('muda o selo quando muda o lotId', () => {
    expect(sealLot(SECRET, makeSeal({ lotId: 8 }))).not.toBe(
      sealLot(SECRET, makeSeal()),
    );
  });
});

function signed(fields: Omit<ChainBid, 'hash'>): ChainBid {
  return { ...fields, hash: hashBid(SECRET, { lotId: LOT, ...fields }) };
}

function makeChain(count = 3): ChainBid[] {
  const bids: ChainBid[] = [];
  for (let seq = 1; seq <= count; seq++) {
    bids.push(
      signed({
        seq,
        userId: 40 + (seq % 2),
        amount: 100_000 + seq * 5_000,
        createdAt: new Date(Date.UTC(2026, 10, 1, 12, seq)),
        prevHash: bids.at(-1)?.hash ?? GENESIS,
      }),
    );
  }
  return bids;
}

function makeReceipt(
  last: ChainBid,
  override: Partial<ChainReceipt> = {},
): ChainReceipt {
  const fields = {
    alias: 'Licitante ABCDEF',
    amount: last.amount,
    finalHash: last.hash,
    settledAt: new Date('2026-11-01T13:00:00.000Z'),
  };
  return {
    ...fields,
    signature: signReceipt(SECRET, { lotId: LOT, ...fields }),
    ...override,
  };
}

function makeAudit(override: Partial<AuditInput> = {}): AuditInput {
  const bids = override.bids ?? makeChain();
  return {
    lotId: LOT,
    seal: expectedSeal(SECRET, LOT, bids.at(-1) ?? null),
    settled: false,
    bids,
    receipt: null,
    ...override,
  };
}

function tamper(index: number, change: Partial<ChainBid>): ChainBid[] {
  const bids = makeChain();
  bids[index] = { ...bids[index], ...change };
  return bids;
}

function check(override: Partial<AuditInput> = {}) {
  const { result, brokenSeq } = verify(SECRET, makeAudit(override));
  return { result, brokenSeq };
}

describe('chain.verify', () => {
  it('declara íntegra a cadeia sem alteração', () => {
    expect(check()).toEqual({ result: 'intact', brokenSeq: null });
  });

  it('declara íntegro o lote sem lances com selo intacto', () => {
    expect(check({ bids: [] })).toEqual({ result: 'intact', brokenSeq: null });
  });

  it('aponta o lance com valor alterado', () => {
    expect(check({ bids: tamper(1, { amount: 999_999 }) })).toEqual({
      result: 'tampered',
      brokenSeq: 2,
    });
  });

  it('aponta o lance com dono trocado', () => {
    expect(check({ bids: tamper(1, { userId: 99 }) })).toEqual({
      result: 'tampered',
      brokenSeq: 2,
    });
  });

  it('aponta o lance com data alterada', () => {
    const createdAt = new Date('2026-11-01T11:00:00.000Z');

    expect(check({ bids: tamper(1, { createdAt }) })).toEqual({
      result: 'tampered',
      brokenSeq: 2,
    });
  });

  it('aponta o lance seguinte a um lance removido do meio', () => {
    const [first, , third] = makeChain();

    expect(check({ bids: [first, third] })).toEqual({
      result: 'tampered',
      brokenSeq: 3,
    });
  });

  it('aponta o lance inserido no meio da cadeia', () => {
    const [first, second, third] = makeChain();
    const inserted = { ...second, amount: 106_000, hash: FORGED };
    const shifted = [
      { ...second, seq: 3 },
      { ...third, seq: 4 },
    ];

    expect(check({ bids: [first, inserted, ...shifted] })).toEqual({
      result: 'tampered',
      brokenSeq: 2,
    });
  });

  it('aponta o lance acrescentado no fim sem assinatura válida', () => {
    const bids = makeChain();
    const appended = {
      ...bids[2],
      seq: 4,
      amount: 200_000,
      prevHash: bids[2].hash,
      hash: FORGED,
    };

    expect(check({ bids: [...bids, appended] })).toEqual({
      result: 'tampered',
      brokenSeq: 4,
    });
  });

  it('detecta lances removidos do fim pelo selo', () => {
    const bids = makeChain();
    const seal = expectedSeal(SECRET, LOT, bids[2]);

    expect(check({ bids: bids.slice(0, 2), seal })).toEqual({
      result: 'truncated',
      brokenSeq: null,
    });
  });

  it('aponta só o primeiro lance quebrado quando há vários', () => {
    const bids = tamper(0, { amount: 1 });
    bids[2] = { ...bids[2], amount: 1 };

    expect(check({ bids })).toEqual({ result: 'tampered', brokenSeq: 1 });
  });

  it('detecta dois lances com a ordem trocada', () => {
    const [first, second, third] = makeChain();
    const swapped = [first, { ...third, seq: 2 }, { ...second, seq: 3 }];

    expect(check({ bids: swapped })).toEqual({
      result: 'tampered',
      brokenSeq: 2,
    });
  });

  it('prioriza adulteração quando a cadeia quebra e o selo também não bate', () => {
    expect(
      check({ bids: tamper(1, { amount: 999_999 }), seal: FORGED }),
    ).toEqual({ result: 'tampered', brokenSeq: 2 });
  });

  it('aponta como adulterado um lance com seq maior que 1 e prev_hash igual ao GENESIS', () => {
    const [first, second] = makeChain(2);
    const restarted = signed({ ...second, prevHash: GENESIS });

    expect(check({ bids: [first, restarted] })).toEqual({
      result: 'tampered',
      brokenSeq: 2,
    });
  });

  it('conta o selo nulo como não íntegro', () => {
    expect(check({ seal: null })).toEqual({
      result: 'truncated',
      brokenSeq: null,
    });
  });

  it('não declara íntegro o lote liquidado com hash final do comprovante diferente do último lance', () => {
    const bids = makeChain();

    expect(
      check({ bids, settled: true, receipt: makeReceipt(bids[1]) }),
    ).toEqual({ result: 'receipt_tampered', brokenSeq: null });
  });

  it('não declara íntegro o lote liquidado com assinatura do comprovante inválida', () => {
    const bids = makeChain();
    const receipt = makeReceipt(bids[2], { signature: FORGED });

    expect(check({ bids, settled: true, receipt })).toEqual({
      result: 'receipt_tampered',
      brokenSeq: null,
    });
  });

  it('acusa o comprovante do lote liquidado com lances quando ele falta', () => {
    expect(check({ settled: true, receipt: null })).toEqual({
      result: 'receipt_tampered',
      brokenSeq: null,
    });
  });

  it('declara íntegro o lote liquidado sem lances e sem comprovante', () => {
    expect(check({ bids: [], settled: true, receipt: null })).toEqual({
      result: 'intact',
      brokenSeq: null,
    });
  });

  it('acusa o comprovante de lote não liquidado', () => {
    const bids = makeChain();

    expect(check({ bids, receipt: makeReceipt(bids[2]) })).toEqual({
      result: 'receipt_tampered',
      brokenSeq: null,
    });
  });

  it('acusa o comprovante de lote liquidado sem lances', () => {
    const receipt = makeReceipt(makeChain()[2]);

    expect(check({ bids: [], settled: true, receipt })).toEqual({
      result: 'receipt_tampered',
      brokenSeq: null,
    });
  });

  it('declara íntegro o lote liquidado com comprovante válido', () => {
    const bids = makeChain();

    expect(
      check({ bids, settled: true, receipt: makeReceipt(bids[2]) }),
    ).toEqual({ result: 'intact', brokenSeq: null });
  });

  it('marca todos os lances como íntegros na cadeia intacta', () => {
    expect(verify(SECRET, makeAudit()).marks).toEqual([
      'intact',
      'intact',
      'intact',
    ]);
  });

  it('marca cada lance pela posição em relação ao primeiro quebrado', () => {
    const audit = makeAudit({ bids: tamper(1, { amount: 999_999 }) });

    expect(verify(SECRET, audit).marks).toEqual([
      'intact',
      'tampered',
      'unverifiable',
    ]);
  });
});
