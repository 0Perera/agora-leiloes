import request from 'supertest';
import { LotEventsService } from '../src/lots/lot-events.service';
import {
  type Account,
  at,
  BASE,
  eventually,
  lockLot,
  start,
  type Stream,
  type TestApp,
  waitForLockWaiters,
} from './app';

const STARTING_BID = 100_000;
const INCREMENT = 5_000;
const DEPOSIT = 1_000_000;

type WalletRow = { userId: number; balance: number; committed: number };

type ReceiptRow = { alias: string; amount: number; token: string };

type Detail = {
  result: { alias: string | null; amount: number | null } | null;
  me?: { alias: string; receiptToken?: string };
};

let api: TestApp;
let auctioneer: Account;
let bidder: Account;
let rival: Account;
let lotId: number;
let open: Stream | undefined;

beforeAll(async () => {
  api = await start();
});

beforeEach(async () => {
  await api.reset();
  auctioneer = await api.signup('AUCTIONEER');
  bidder = await api.signup('BIDDER');
  rival = await api.signup('BIDDER');
  await api.deposit(bidder, DEPOSIT);
  await api.deposit(rival, DEPOSIT);
  lotId = await api.createLot(auctioneer, {
    startsAt: BASE,
    endsAt: at(60),
    startingBid: STARTING_BID,
    increment: INCREMENT,
  });
});

afterEach(() => {
  open?.close();
  open = undefined;
});

afterAll(async () => {
  await api.close();
});

function detail(account?: Account): request.Test {
  const call = request(api.server).get(`/lots/${lotId}`);
  return account ? call.auth(account.token, { type: 'bearer' }) : call;
}

function end(): void {
  api.clock.set(at(60));
}

function wallets(): Promise<WalletRow[]> {
  return api.db.query<WalletRow[]>(
    `SELECT user_id AS "userId", balance, committed FROM wallets ORDER BY user_id`,
  );
}

function receipts(): Promise<ReceiptRow[]> {
  return api.db.query<ReceiptRow[]>(
    'SELECT alias, amount, token FROM receipts WHERE lot_id = $1',
    [lotId],
  );
}

async function settledAt(): Promise<Date | null> {
  const [lot] = await api.db.query<{ settledAt: Date | null }[]>(
    'SELECT settled_at AS "settledAt" FROM lots WHERE id = $1',
    [lotId],
  );
  return lot.settledAt;
}

function expectSold(rows: WalletRow[], amount: number): void {
  expect(rows).toEqual([
    { userId: auctioneer.id, balance: amount, committed: 0 },
    { userId: bidder.id, balance: DEPOSIT - amount, committed: 0 },
    { userId: rival.id, balance: DEPOSIT, committed: 0 },
  ]);
}

describe('liquidação pelo acesso ao lote', () => {
  it('dois acessos simultâneos liquidam o lote uma vez só', async () => {
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    end();
    const barrier = await lockLot(api.db, lotId);
    const pending = [detail(), detail()].map((call) =>
      call.then((response) => response),
    );

    let waiters: number;
    try {
      waiters = await waitForLockWaiters(api.db, barrier, 2);
      await barrier.release();
    } catch (error) {
      await barrier.abort();
      await Promise.allSettled(pending);
      throw error;
    }
    const responses = await Promise.all(pending);

    expect(waiters).toBe(2);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(await receipts()).toHaveLength(1);
    expectSold(await wallets(), STARTING_BID);
  });

  it('vencedor e valor saem do último lance mesmo com current_bid alterado', async () => {
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    await api.db.query('UPDATE lots SET current_bid = $2 WHERE id = $1', [
      lotId,
      STARTING_BID * 5,
    ]);
    end();

    await detail().expect(200);

    expectSold(await wallets(), STARTING_BID);
    expect(await receipts()).toEqual([
      expect.objectContaining({ amount: STARTING_BID }),
    ]);
  });

  it('selo inválido não liquida e o acesso responde 200', async () => {
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    await api.db.query('DELETE FROM bids WHERE lot_id = $1', [lotId]);
    const before = await wallets();
    end();

    await detail().expect(200);

    expect(await settledAt()).toBeNull();
    expect(await receipts()).toEqual([]);
    expect(await wallets()).toEqual(before);
  });

  it('lote sem lances só recebe settled_at', async () => {
    const before = await wallets();
    end();

    const response = await detail().expect(200);

    expect((response.body as Detail).result).toEqual({
      alias: null,
      amount: null,
    });
    expect(await settledAt()).toEqual(at(60));
    expect(await receipts()).toEqual([]);
    expect(await wallets()).toEqual(before);
  });

  it('só o vencedor recebe o token do comprovante', async () => {
    await api.bid(rival, lotId, STARTING_BID).expect(201);
    await api.bid(bidder, lotId, STARTING_BID + INCREMENT).expect(201);
    end();

    const winner = (await detail(bidder).expect(200)).body as Detail;
    const [receipt] = await receipts();
    const loser = (await detail(rival).expect(200)).body as Detail;

    const result = { alias: receipt.alias, amount: STARTING_BID + INCREMENT };
    expect(winner.result).toEqual(result);
    expect(winner.me?.receiptToken).toBe(receipt.token);
    expect(loser.result).toEqual(result);
    expect(loser.me).not.toHaveProperty('receiptToken');
  });

  it('stream recebe o evento settled só com alias e valor', async () => {
    const placed = await api.bid(bidder, lotId, STARTING_BID).expect(201);
    open = await api.stream(lotId);
    await eventually(
      () => api.app.get(LotEventsService).listeners(lotId) === 1,
    );
    end();

    await detail().expect(200);
    const events = await open.waitFor(1);

    expect(events).toEqual([
      {
        type: 'settled',
        data: {
          alias: (placed.body as { alias: string }).alias,
          amount: STARTING_BID,
        },
      },
    ]);
  });
});
