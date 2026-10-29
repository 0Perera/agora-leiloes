import request from 'supertest';
import { LotEventsService } from '../src/lots/lot-events.service';
import { SettlementService } from '../src/settlement/settlement.service';
import {
  type Account,
  at,
  BASE,
  DEPOSIT,
  eventually,
  INCREMENT,
  lockLot,
  start,
  STARTING_BID,
  type Stream,
  type TestApp,
  waitForLockWaiters,
} from './app';

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

describe('GET /lots/:id liquidando o lote vencido', () => {
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

describe('GET /lots/:id sem liquidar o lote', () => {
  it('falha na liquidação não derruba o acesso ao lote', async () => {
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    await api.db.query(
      'UPDATE wallets SET balance = 2147483647 WHERE user_id = $1',
      [auctioneer.id],
    );
    const before = await wallets();
    end();

    const response = await detail().expect(200);

    expect((response.body as Detail).result).toBeNull();
    expect(await settledAt()).toBeNull();
    expect(await receipts()).toEqual([]);
    expect(await wallets()).toEqual(before);
  });

  it('lote cancelado e vencido não é liquidado', async () => {
    await request(api.server)
      .post(`/lots/${lotId}/cancel`)
      .auth(auctioneer.token, { type: 'bearer' })
      .expect(204);
    end();

    await detail().expect(404);

    expect(await settledAt()).toBeNull();
  });

  it('lote ainda não terminado não é liquidado', async () => {
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    api.clock.set(new Date(at(60).getTime() - 1));

    const response = await detail().expect(200);

    expect((response.body as Detail).result).toBeNull();
    expect(await settledAt()).toBeNull();
    expect(await receipts()).toEqual([]);
  });

  it('segundo acesso não grava outro comprovante nem emite outro evento', async () => {
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    const settled = jest.spyOn(api.app.get(LotEventsService), 'settled');
    end();
    await detail().expect(200);
    const first = await settledAt();

    await detail().expect(200);

    expect(settled).toHaveBeenCalledTimes(1);
    expect(await receipts()).toHaveLength(1);
    expect(await settledAt()).toEqual(first);
    settled.mockRestore();
  });
});

function cancel(id: number): request.Test {
  return request(api.server)
    .post(`/lots/${id}/cancel`)
    .auth(auctioneer.token, { type: 'bearer' })
    .expect(204);
}

function settlement(): SettlementService {
  return api.app.get(SettlementService);
}

describe('SettlementService.due', () => {
  it('inclui o lote que encerra no instante exato', async () => {
    expect(await settlement().due(at(60))).toEqual([lotId]);
  });

  it('exclui o lote cancelado e o já liquidado', async () => {
    const cancelled = await api.createLot(auctioneer, {
      startsAt: BASE,
      endsAt: at(30),
    });
    const settled = await api.createLot(auctioneer, {
      startsAt: BASE,
      endsAt: at(30),
    });
    await cancel(cancelled);
    api.clock.set(at(30));
    await settlement().settle(settled);

    expect(await settlement().due(at(60))).toEqual([lotId]);
  });
});

describe('SettlementService.next', () => {
  it('devolve só o fim futuro de lote aberto', async () => {
    await api.createLot(auctioneer, { startsAt: BASE, endsAt: at(30) });
    const cancelled = await api.createLot(auctioneer, {
      startsAt: BASE,
      endsAt: at(40),
    });
    await cancel(cancelled);

    expect(await settlement().next(at(30))).toEqual(at(60));
  });
});

describe('SettlementTimer.refresh', () => {
  it('é chamado depois de um lance aceito', async () => {
    const before = api.timer.refreshes;

    await api.bid(bidder, lotId, STARTING_BID).expect(201);

    expect(api.timer.refreshes).toBe(before + 1);
  });

  it('é chamado depois da criação de um lote', async () => {
    const before = api.timer.refreshes;

    await api.createLot(auctioneer, { startsAt: BASE, endsAt: at(30) });

    expect(api.timer.refreshes).toBe(before + 1);
  });
});
