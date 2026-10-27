import type { Response } from 'supertest';
import { GENESIS, hashBid, sealLot } from '../src/audit/chain';
import {
  type Account,
  at,
  BASE,
  lockLot,
  secret,
  start,
  type TestApp,
  waitForLockWaiters,
} from './app';

const N = 10;
const STARTING_BID = 100_000;
const INCREMENT = 5_000;
const DEPOSIT = 1_000_000;

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
  const pending = offers.map(({ bidder, amount }) =>
    test.bid(bidder, lotId, amount).then((response) => response),
  );
  try {
    const waiters = await waitForLockWaiters(test.db, barrier, offers.length);
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

describe('lances simultâneos', () => {
  let test: TestApp;
  let lotId: number;
  let offers: Offer[];
  let result: Race;
  let bids: BidRow[];

  beforeAll(async () => {
    test = await start();
    await test.reset();
    const auctioneer = await test.signup('AUCTIONEER');
    lotId = await test.createLot(auctioneer, {
      startsAt: BASE,
      endsAt: at(24 * 60),
      startingBid: STARTING_BID,
      increment: INCREMENT,
    });
    offers = (await bidders(test, N)).map((bidder, i) => ({
      bidder,
      amount: STARTING_BID + i * INCREMENT,
    }));
    result = await race(test, lotId, offers);
    bids = await test.db.query<BidRow[]>(
      `SELECT seq, user_id AS "userId", amount, created_at AS "createdAt",
              prev_hash AS "prevHash", hash
       FROM bids WHERE lot_id = $1 ORDER BY seq`,
      [lotId],
    );
  });

  afterAll(async () => {
    await test.close();
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
    let prevHash = GENESIS;
    for (const bid of bids) {
      expect(bid.prevHash).toBe(prevHash);
      expect(bid.hash).toBe(hashBid(secret(), { ...bid, lotId, prevHash }));
      prevHash = bid.hash;
    }
  });

  it('mantém o selo do lote igual ao recálculo', async () => {
    const [lot] = await test.db.query<{ seal: string }[]>(
      'SELECT seal FROM lots WHERE id = $1',
      [lotId],
    );
    const last = bids[bids.length - 1];
    expect(lot.seal).toBe(
      sealLot(secret(), { lotId, count: bids.length, lastHash: last.hash }),
    );
  });

  it('mantém lance atual e contagem iguais ao último lance', async () => {
    const [lot] = await test.db.query<
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
    const wallets = await test.db.query<WalletRow[]>(
      'SELECT user_id AS "userId", committed FROM wallets ORDER BY user_id',
    );
    const committed = wallets.filter((wallet) => wallet.committed !== 0);
    expect(committed).toEqual([
      { userId: top.bidder.id, committed: top.amount },
    ]);
  });

  it('mantém saldo maior ou igual ao comprometido, e comprometido não negativo, em todas as carteiras', async () => {
    const wallets = await test.db.query<WalletRow[]>(
      'SELECT user_id AS "userId", balance, committed FROM wallets',
    );
    for (const wallet of wallets) {
      expect(wallet.committed).toBeGreaterThanOrEqual(0);
      expect(wallet.balance).toBeGreaterThanOrEqual(wallet.committed);
    }
  });

  it('dois lances simultâneos do mesmo mínimo: um aceito e o outro BID_BELOW_MINIMUM', async () => {
    const auctioneer = await test.signup('AUCTIONEER');
    const tied = await test.createLot(auctioneer, {
      startsAt: BASE,
      endsAt: at(24 * 60),
      startingBid: STARTING_BID,
      increment: INCREMENT,
    });
    const pair = (await bidders(test, 2)).map((bidder) => ({
      bidder,
      amount: STARTING_BID,
    }));

    const { waiters, responses } = await race(test, tied, pair);

    expect(waiters).toBe(2);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 422]);
    expect(responses.find((r) => !isAccepted(r))?.body).toEqual({
      code: 'BID_BELOW_MINIMUM',
      minimum: STARTING_BID + INCREMENT,
    });
  });
});
