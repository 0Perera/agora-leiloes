import type { Response } from 'supertest';
import { GENESIS, hashBid, sealLot } from '../src/audit/chain';
import {
  type Account,
  at,
  type Barrier,
  BASE,
  DEPOSIT,
  INCREMENT,
  lockLot,
  lockWallet,
  secret,
  start,
  STARTING_BID,
  type TestApp,
  waitForLockWaiters,
} from './app';

const N = 10;

type Offer = { bidder: Account; amount: number };

type Race = { waiters: number; responses: Response[] };

type BidRow = {
  seq: number;
  userId: number;
  amount: number;
  createdAt: Date;
  prevHash: string;
  hash: string;
};

type WalletRow = { userId: number; balance: number; committed: number };

async function race(
  test: TestApp,
  lotId: number,
  offers: Offer[],
): Promise<Race> {
  const barrier = await lockLot(test.db, lotId);
  return contend(
    test,
    barrier,
    offers.map(({ bidder, amount }) => ({ bidder, lotId, amount })),
  );
}

async function contend(
  test: TestApp,
  barrier: Barrier,
  requests: { bidder: Account; lotId: number; amount: number }[],
): Promise<Race> {
  const pending = requests.map(({ bidder, lotId, amount }) =>
    // O supertest só envia no then(): sem ele, nenhum lance sai antes da barreira.
    test.bid(bidder, lotId, amount).then((response) => response),
  );
  try {
    const waiters = await waitForLockWaiters(test.db, barrier, requests.length);
    await barrier.release();
    return { waiters, responses: await Promise.all(pending) };
  } catch (error) {
    await barrier.abort();
    await Promise.allSettled(pending);
    throw error;
  }
}

async function bidders(test: TestApp, count: number): Promise<Account[]> {
  const accounts: Account[] = [];
  for (let i = 0; i < count; i += 1) {
    const bidder = await test.signup('BIDDER');
    await test.deposit(bidder, DEPOSIT);
    accounts.push(bidder);
  }
  return accounts;
}

function isAccepted(response: Response): boolean {
  return response.status === 201;
}

function readBids(test: TestApp, lotId: number): Promise<BidRow[]> {
  return test.db.query<BidRow[]>(
    `SELECT seq, user_id AS "userId", amount, created_at AS "createdAt",
            prev_hash AS "prevHash", hash
     FROM bids WHERE lot_id = $1 ORDER BY seq`,
    [lotId],
  );
}

async function readSeal(test: TestApp, lotId: number): Promise<string> {
  const [lot] = await test.db.query<{ seal: string }[]>(
    'SELECT seal FROM lots WHERE id = $1',
    [lotId],
  );
  return lot.seal;
}

function expectChain(bids: BidRow[], lotId: number): void {
  let prevHash = GENESIS;
  for (const bid of bids) {
    expect(bid.prevHash).toBe(prevHash);
    expect(bid.hash).toBe(hashBid(secret(), { ...bid, lotId, prevHash }));
    prevHash = bid.hash;
  }
}

function expectedSeal(bids: BidRow[], lotId: number): string {
  const last = bids[bids.length - 1];
  return sealLot(secret(), { lotId, count: bids.length, lastHash: last.hash });
}

function committedOf(test: TestApp, ids: number[]): Promise<WalletRow[]> {
  return test.db.query<WalletRow[]>(
    `SELECT user_id AS "userId", balance, committed FROM wallets
     WHERE user_id = ANY($1) ORDER BY user_id`,
    [ids],
  );
}

async function liveLot(test: TestApp): Promise<number> {
  const auctioneer = await test.signup('AUCTIONEER');
  return test.createLot(auctioneer, {
    startsAt: BASE,
    endsAt: at(24 * 60),
    startingBid: STARTING_BID,
    increment: INCREMENT,
  });
}

let api: TestApp;

beforeAll(async () => {
  api = await start();
});

afterAll(async () => {
  await api.close();
});

describe('POST /lots/:id/bids simultâneos', () => {
  let lotId: number;
  let offers: Offer[];
  let result: Race;
  let bids: BidRow[];

  beforeAll(async () => {
    await api.reset();
    lotId = await liveLot(api);
    offers = (await bidders(api, N)).map((bidder, i) => ({
      bidder,
      amount: STARTING_BID + i * INCREMENT,
    }));
    result = await race(api, lotId, offers);
    bids = await readBids(api, lotId);
  });

  it('os N lances esperaram o lock do lote em conexões separadas', () => {
    expect(result.waiters).toBe(N);
  });

  it('responde só 201 ou 422 BID_BELOW_MINIMUM', () => {
    const refused = result.responses.filter((r) => !isAccepted(r));
    for (const response of refused) {
      expect(response.status).toBe(422);
      expect(response.body).toMatchObject({ code: 'BID_BELOW_MINIMUM' });
    }
  });

  it('grava os seq contínuos de 1 até o número de lances aceitos', () => {
    const accepted = result.responses.filter(isAccepted).length;
    expect(bids.map((bid) => bid.seq)).toEqual(
      Array.from({ length: accepted }, (_, i) => i + 1),
    );
  });

  it('mantém a cadeia de hashes válida', () => {
    expectChain(bids, lotId);
  });

  it('mantém o selo do lote igual ao recálculo', async () => {
    expect(await readSeal(api, lotId)).toBe(expectedSeal(bids, lotId));
  });

  it('mantém lance atual e contagem iguais ao último lance', async () => {
    const [lot] = await api.db.query<
      { currentBid: number; bidCount: number }[]
    >(
      `SELECT current_bid AS "currentBid", bid_count AS "bidCount"
       FROM lots WHERE id = $1`,
      [lotId],
    );
    const last = bids[bids.length - 1];
    expect(lot).toEqual({ currentBid: last.amount, bidCount: last.seq });
  });

  it('deixa o maior lance como líder final', () => {
    const top = offers[N - 1];
    expect(bids[bids.length - 1]).toMatchObject({
      userId: top.bidder.id,
      amount: top.amount,
    });
  });

  it('compromete valor só na carteira do líder final', async () => {
    const top = offers[N - 1];
    const wallets = await committedOf(
      api,
      offers.map(({ bidder }) => bidder.id),
    );
    const committed = wallets
      .filter((wallet) => wallet.committed !== 0)
      .map(({ userId, committed }) => ({ userId, committed }));
    expect(committed).toEqual([
      { userId: top.bidder.id, committed: top.amount },
    ]);
  });

  it('mantém saldo maior ou igual ao comprometido, e comprometido não negativo, em todas as carteiras', async () => {
    const wallets = await api.db.query<WalletRow[]>(
      'SELECT user_id AS "userId", balance, committed FROM wallets',
    );
    for (const wallet of wallets) {
      expect(wallet.committed).toBeGreaterThanOrEqual(0);
      expect(wallet.balance).toBeGreaterThanOrEqual(wallet.committed);
    }
  });
});

describe('POST /lots/:id/bids simultâneos do mesmo mínimo', () => {
  it('dois lances simultâneos do mesmo mínimo: um aceito e o outro BID_BELOW_MINIMUM', async () => {
    await api.reset();
    const lotId = await liveLot(api);
    const pair = (await bidders(api, 2)).map((bidder) => ({
      bidder,
      amount: STARTING_BID,
    }));

    const { waiters, responses } = await race(api, lotId, pair);

    expect(waiters).toBe(2);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 422]);
    const loser = responses.findIndex((r) => !isAccepted(r));
    expect(responses[loser].body).toEqual({
      code: 'BID_BELOW_MINIMUM',
      minimum: STARTING_BID + INCREMENT,
    });
    const winner = pair[1 - loser].bidder;
    const bids = await readBids(api, lotId);
    expect(bids).toMatchObject([
      { seq: 1, userId: winner.id, amount: STARTING_BID },
    ]);
    expectChain(bids, lotId);
    expect(await readSeal(api, lotId)).toBe(expectedSeal(bids, lotId));
    expect(
      await committedOf(
        api,
        pair.map(({ bidder }) => bidder.id),
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: winner.id, committed: STARTING_BID }),
        expect.objectContaining({
          userId: pair[loser].bidder.id,
          committed: 0,
        }),
      ]) as unknown,
    );
  });
});

describe('POST /lots/:id/bids do mesmo licitante em dois lotes', () => {
  it('mesmo licitante em dois lotes com saldo para um só lance: um aceito e o outro INSUFFICIENT_BALANCE', async () => {
    await api.reset();
    const lots = [await liveLot(api), await liveLot(api)];
    const bidder = await api.signup('BIDDER');
    await api.deposit(bidder, STARTING_BID);
    const barrier = await lockWallet(api.db, bidder.id);

    const { waiters, responses } = await contend(
      api,
      barrier,
      lots.map((lotId) => ({ bidder, lotId, amount: STARTING_BID })),
    );

    expect(waiters).toBe(2);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 422]);
    expect(responses.find((r) => !isAccepted(r))?.body).toEqual({
      code: 'INSUFFICIENT_BALANCE',
      available: 0,
    });
    const [wallet] = await committedOf(api, [bidder.id]);
    expect(wallet.committed).toBe(STARTING_BID);
    expect(wallet.balance).toBeGreaterThanOrEqual(wallet.committed);
  });
});
