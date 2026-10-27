import request from 'supertest';
import { LotEventsService } from '../src/lots/lot-events.service';
import {
  type Account,
  at,
  BASE,
  eventually,
  start,
  type Stream,
  type TestApp,
} from './app';

const STARTING_BID = 100_000;
const INCREMENT = 5_000;

type History = {
  items: { seq: number }[];
  page: number;
  pageSize: number;
  total: number;
};

type WalletBody = {
  committed: number;
  lots: { id: number; amount: number }[];
  lotsTotal: number;
};

describe('tempo real, histórico e situação do licitante', () => {
  let test: TestApp;
  let auctioneer: Account;
  let bidder: Account;
  let rival: Account;
  let lotId: number;
  let open: Stream | undefined;

  beforeAll(async () => {
    test = await start();
  });

  beforeEach(async () => {
    await test.reset();
    auctioneer = await test.signup('AUCTIONEER');
    bidder = await test.signup('BIDDER');
    rival = await test.signup('BIDDER');
    await test.deposit(bidder, 10_000_000);
    await test.deposit(rival, 10_000_000);
    lotId = await test.createLot(auctioneer, {
      startsAt: BASE,
      endsAt: at(24 * 60),
      startingBid: STARTING_BID,
      increment: INCREMENT,
    });
  });

  afterEach(() => {
    open?.close();
    open = undefined;
  });

  afterAll(async () => {
    await test.close();
  });

  function listeners(): number {
    return test.app.get(LotEventsService).listeners(lotId);
  }

  async function subscribe(): Promise<Stream> {
    open = await test.stream(lotId);
    await eventually(() => listeners() === 1);
    return open;
  }

  async function alternate(count: number): Promise<void> {
    for (let index = 0; index < count; index++) {
      const account = index % 2 === 0 ? bidder : rival;
      await test
        .bid(account, lotId, STARTING_BID + index * INCREMENT)
        .expect(201);
    }
  }

  function detail(token?: string): request.Test {
    const call = request(test.server).get(`/lots/${lotId}`);
    return token ? call.auth(token, { type: 'bearer' }) : call;
  }

  async function wallet(account: Account): Promise<WalletBody> {
    const response = await request(test.server)
      .get('/wallet')
      .auth(account.token, { type: 'bearer' })
      .expect(200);
    return response.body as WalletBody;
  }

  it('stream recebe o lance aceito e não o recusado', async () => {
    const stream = await subscribe();

    const placed = await test.bid(bidder, lotId, STARTING_BID).expect(201);
    await test.bid(rival, lotId, STARTING_BID).expect(422);
    await test.bid(rival, lotId, STARTING_BID + INCREMENT).expect(201);
    const events = await stream.waitFor(2);

    expect(events).toEqual([
      { type: 'bid', data: placed.body as unknown },
      {
        type: 'bid',
        data: expect.objectContaining({ seq: 2 }) as unknown,
      },
    ]);
  });

  it('stream de lote inexistente responde 404', async () => {
    open = await test.stream(lotId + 1);

    expect(open.status).toBe(404);
  });

  it('fechar a conexão zera os ouvintes', async () => {
    const stream = await subscribe();

    stream.close();

    await expect(eventually(() => listeners() === 0)).resolves.toBe(true);
  });

  it('histórico pagina do lance mais recente para o mais antigo', async () => {
    await alternate(25);

    const response = await request(test.server)
      .get(`/lots/${lotId}/bids`)
      .query({ page: 1 })
      .expect(200);
    const history = response.body as History;

    expect(history.items.map((item) => item.seq)).toEqual(
      Array.from({ length: 20 }, (_, index) => 25 - index),
    );
    expect(history.total).toBe(25);
  });

  it('histórico além do fim responde página vazia', async () => {
    await alternate(25);

    const response = await request(test.server)
      .get(`/lots/${lotId}/bids`)
      .query({ page: 3 })
      .expect(200);

    expect(response.body).toEqual({
      items: [],
      page: 3,
      pageSize: 20,
      total: 25,
    });
  });

  it('detalhe com token de licitante traz o alias dos lances dele', async () => {
    const placed = await test.bid(bidder, lotId, STARTING_BID).expect(201);

    const response = await detail(bidder.token).expect(200);

    expect(response.body).toMatchObject({
      me: { alias: (placed.body as { alias: string }).alias },
    });
  });

  it('detalhe sem token não traz me', async () => {
    const response = await detail().expect(200);

    expect(response.body).not.toHaveProperty('me');
  });

  it('detalhe com token de leiloeiro não traz me', async () => {
    const response = await detail(auctioneer.token).expect(200);

    expect(response.body).not.toHaveProperty('me');
  });

  it('detalhe com token adulterado responde 401', async () => {
    await detail(`${bidder.token}x`).expect(401);
  });

  it('carteira lista o lote ao vivo e o encerrado não liquidado', async () => {
    const ended = await test.createLot(auctioneer, {
      startsAt: BASE,
      endsAt: at(10),
    });
    await test.bid(bidder, lotId, STARTING_BID).expect(201);
    await test.bid(bidder, ended, STARTING_BID + 1).expect(201);
    test.clock.set(at(20));

    const body = await wallet(bidder);

    expect(body.lots.map((lot) => lot.id)).toEqual([ended, lotId]);
    expect(body.lotsTotal).toBe(2);
    expect(body.lots.reduce((sum, lot) => sum + lot.amount, 0)).toBe(
      body.committed,
    );
  });

  it('carteira não lista o lote em que o licitante foi superado', async () => {
    await test.bid(bidder, lotId, STARTING_BID).expect(201);
    await test.bid(rival, lotId, STARTING_BID + INCREMENT).expect(201);

    const body = await wallet(bidder);

    expect(body.lots).toEqual([]);
    expect(body.lotsTotal).toBe(0);
  });

  it('carteira mostra até 20 lotes e o total de todos', async () => {
    const lots = [lotId];
    for (let index = 0; index < 20; index += 1) {
      lots.push(
        await test.createLot(auctioneer, { startsAt: BASE, endsAt: at(60) }),
      );
    }
    for (const id of lots) {
      await test.bid(bidder, id, STARTING_BID).expect(201);
    }

    const body = await wallet(bidder);

    expect(body.lots).toHaveLength(20);
    expect(body.lotsTotal).toBe(21);
  });
});
