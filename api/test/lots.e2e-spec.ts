import request from 'supertest';
import { SettlementService } from '../src/settlement/settlement.service';
import { type Account, at, BASE, start, type TestApp } from './app';

type Card = { id: number };
type Showcase = {
  items: Card[];
  counts: { live: number; scheduled: number; ended: number };
};

let api: TestApp;
let auctioneer: Account;

function live(endsAt: Date, title?: string): Promise<number> {
  return api.createLot(auctioneer, { startsAt: BASE, endsAt, title });
}

function scheduled(startsAt: Date, title?: string): Promise<number> {
  const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
  return api.createLot(auctioneer, { startsAt, endsAt, title });
}

function ended(endsAt: Date, title?: string): Promise<number> {
  return api.createLot(auctioneer, { startsAt: at(-300), endsAt, title });
}

async function featured(): Promise<request.Response> {
  return request(api.server).get('/lots/featured');
}

async function showcase(query: Record<string, string>): Promise<Showcase> {
  const response = await request(api.server)
    .get('/lots')
    .query(query)
    .expect(200);
  return response.body as Showcase;
}

beforeAll(async () => {
  api = await start();
});

beforeEach(async () => {
  await api.reset();
  auctioneer = await api.signup('AUCTIONEER');
});

afterAll(async () => {
  await api.close();
});

describe('GET /lots/featured', () => {
  it('destaque responde 204 sem lotes', async () => {
    const response = await featured();

    expect(response.status).toBe(204);
  });

  it('destaque cai para o agendado mais próximo sem lote ao vivo', async () => {
    await ended(at(-100));
    await scheduled(at(120));
    const nearest = await scheduled(at(60));

    const response = await featured();

    expect(response.body).toMatchObject({ id: nearest, status: 'scheduled' });
  });

  it('destaque prefere o ao vivo que termina primeiro ao agendado', async () => {
    await scheduled(at(30));
    await live(at(120));
    const ending = await live(at(60));

    const response = await featured();

    expect(response.body).toMatchObject({ id: ending, status: 'live' });
  });

  it('destaque prefere o ao vivo com maior lance atual', async () => {
    const bidder = await api.signup('BIDDER');
    await api.deposit(bidder, 1_000_000);
    const ending = await live(at(60));
    const richer = await live(at(120));
    await api.bid(bidder, ending, 100_000).expect(201);
    await api.bid(bidder, richer, 150_000).expect(201);

    const response = await featured();

    expect(response.body).toMatchObject({ id: richer, currentBid: 150_000 });
  });
});

describe('GET /lots', () => {
  it('lote cancelado fica fora de GET /lots, /lots/featured e /lots/:id (404)', async () => {
    const lotId = await scheduled(at(60));
    await request(api.server)
      .post(`/lots/${lotId}/cancel`)
      .auth(auctioneer.token, { type: 'bearer' })
      .expect(204);

    const list = await showcase({ status: 'scheduled' });
    expect(list.items).toEqual([]);
    expect(list.counts.scheduled).toBe(0);
    expect((await featured()).status).toBe(204);
    await request(api.server).get(`/lots/${lotId}`).expect(404);
  });

  it('counts das três abas aplicam o q', async () => {
    await live(at(60), 'Retrato de um homem');
    await live(at(90), 'Paisagem com rio');
    await scheduled(at(60), 'Retrato de uma dama');
    await ended(at(-100), 'Retrato de família');

    const { counts } = await showcase({ q: 'retrato' });

    expect(counts).toEqual({ live: 1, scheduled: 1, ended: 1 });
  });

  describe('ordem de cada aba', () => {
    const expected: Record<string, number[]> = {};

    beforeEach(async () => {
      const [farLive, nearLive] = [await live(at(120)), await live(at(60))];
      expected.live = [nearLive, farLive];
      const [laterStart, soonerStart] = [
        await scheduled(at(120)),
        await scheduled(at(60)),
      ];
      expected.scheduled = [soonerStart, laterStart];
      const [older, newer] = [await ended(at(-200)), await ended(at(-100))];
      expected.ended = [newer, older];
    });

    it.each([
      ['live', 'ao vivo por fim crescente'],
      ['scheduled', 'agendados por início crescente'],
      ['ended', 'encerrados por fim decrescente'],
    ])('%s: %s', async (status) => {
      const { items } = await showcase({ status });

      expect(items.map((item) => item.id)).toEqual(expected[status]);
    });
  });
});

describe('POST /lots/:id/cancel', () => {
  const STARTING_BID = 100_000;
  const INCREMENT = 5_000;
  const DEPOSIT = 1_000_000;

  let api: TestApp;
  let auctioneer: Account;
  let first: Account;
  let second: Account;
  let lotId: number;

  type WalletRow = { userId: number; balance: number; committed: number };

  function cancel(id = lotId): request.Test {
    return request(api.server)
      .post(`/lots/${id}/cancel`)
      .auth(auctioneer.token, { type: 'bearer' });
  }

  function wallet(account: Account): Promise<request.Response> {
    return request(api.server)
      .get('/wallet')
      .auth(account.token, { type: 'bearer' })
      .expect(200);
  }

  function wallets(): Promise<WalletRow[]> {
    return api.db.query<WalletRow[]>(
      'SELECT user_id AS "userId", balance, committed FROM wallets ORDER BY user_id',
    );
  }

  async function bidCount(): Promise<number> {
    const [row] = await api.db.query<{ count: number }[]>(
      'SELECT COUNT(*)::int AS count FROM bids WHERE lot_id = $1',
      [lotId],
    );
    return row.count;
  }

  async function biddingWar(): Promise<void> {
    await api.bid(first, lotId, STARTING_BID).expect(201);
    await api.bid(second, lotId, STARTING_BID + INCREMENT).expect(201);
  }

  beforeAll(async () => {
    api = await start();
  });

  beforeEach(async () => {
    await api.reset();
    auctioneer = await api.signup('AUCTIONEER');
    first = await api.signup('BIDDER');
    second = await api.signup('BIDDER');
    await api.deposit(first, DEPOSIT);
    await api.deposit(second, DEPOSIT);
    lotId = await api.createLot(auctioneer, {
      startsAt: BASE,
      endsAt: at(60),
      startingBid: STARTING_BID,
      increment: INCREMENT,
    });
  });

  afterAll(async () => {
    await api.close();
  });

  it('cancela lote ao vivo com lances e devolve o comprometido do líder', async () => {
    const other = await api.createLot(auctioneer, {
      startsAt: BASE,
      endsAt: at(60),
      startingBid: STARTING_BID,
      increment: INCREMENT,
    });
    await api.bid(second, other, STARTING_BID).expect(201);
    await biddingWar();
    const before = await wallets();
    const untouched = before.filter((row) => row.userId !== second.id);

    await cancel().expect(204);

    const after = await wallets();
    expect(after.find((row) => row.userId === second.id)).toEqual({
      userId: second.id,
      balance: DEPOSIT,
      committed: STARTING_BID,
    });
    expect(after.filter((row) => row.userId !== second.id)).toEqual(untouched);
  });

  it('lote cancelado sai dos lotes comprometidos de GET /wallet', async () => {
    await biddingWar();

    await cancel().expect(204);

    expect((await wallet(second)).body).toMatchObject({
      lots: [],
      lotsTotal: 0,
    });
  });

  it('recusa cancelamento de lote com selo divergente com LOT_INTEGRITY_FAILED', async () => {
    await biddingWar();
    await api.db.query('DELETE FROM bids WHERE lot_id = $1 AND seq = 2', [
      lotId,
    ]);
    const before = await wallets();

    const response = await cancel().expect(409);

    expect(response.body).toEqual({ code: 'LOT_INTEGRITY_FAILED' });
    expect(await wallets()).toEqual(before);
    const [row] = await api.db.query<{ cancelledAt: Date | null }[]>(
      'SELECT cancelled_at AS "cancelledAt" FROM lots WHERE id = $1',
      [lotId],
    );
    expect(row.cancelledAt).toBeNull();
  });

  it('depois do fim original, a liquidação não age no lote cancelado', async () => {
    await biddingWar();
    await cancel().expect(204);
    const before = await wallets();
    api.clock.set(at(61));

    await api.app.get(SettlementService).settle(lotId);

    expect(await wallets()).toEqual(before);
    expect(await api.db.query('SELECT id FROM receipts')).toEqual([]);
  });

  it('lance depois do cancelamento é recusado com 404 sem gravar nada', async () => {
    await biddingWar();
    await cancel().expect(204);
    const before = await wallets();

    await api.bid(first, lotId, STARTING_BID + 2 * INCREMENT).expect(404);

    expect(await bidCount()).toBe(2);
    expect(await wallets()).toEqual(before);
  });

  it('no painel, o livro mostra o lote como cancelado e o total recebido não muda', async () => {
    await biddingWar();
    const summary = () =>
      request(api.server)
        .get('/dashboard/summary')
        .auth(auctioneer.token, { type: 'bearer' })
        .expect(200);
    const received = ((await summary()).body as { received: number }).received;

    await cancel().expect(204);
    api.clock.set(at(61));
    await api.app.get(SettlementService).settle(lotId);

    const book = await request(api.server)
      .get('/dashboard/lots?status=all')
      .auth(auctioneer.token, { type: 'bearer' })
      .expect(200);
    expect((book.body as { items: unknown[] }).items).toEqual([
      expect.objectContaining({ id: lotId, status: 'cancelled', result: null }),
    ]);
    expect(((await summary()).body as { received: number }).received).toBe(
      received,
    );
  });

  it('recusa lote encerrado com LOT_ENDED sem mudar nada', async () => {
    await biddingWar();
    const before = await wallets();
    api.clock.set(at(60));

    const response = await cancel().expect(422);

    expect(response.body).toEqual({ code: 'LOT_ENDED' });
    expect(await wallets()).toEqual(before);
  });

  it('emite o evento cancelled depois do commit', async () => {
    const stream = await api.stream(lotId);

    await cancel().expect(204);

    const [event] = await stream.waitFor(1);
    stream.close();
    expect(event).toEqual({
      type: 'cancelled',
      data: { cancelledAt: BASE.toISOString() },
    });
  });
});
