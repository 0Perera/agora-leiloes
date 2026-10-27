import request from 'supertest';
import { type Account, at, BASE, start, type TestApp } from './app';

const STARTING_BID = 100_000;
const INCREMENT = 5_000;

describe('POST /lots/:id/bids', () => {
  let test: TestApp;
  let auctioneer: Account;
  let bidder: Account;
  let lotId: number;
  const endsAt = at(24 * 60);

  beforeAll(async () => {
    test = await start();
  });

  beforeEach(async () => {
    await test.reset();
    auctioneer = await test.signup('AUCTIONEER');
    bidder = await test.signup('BIDDER');
    await test.deposit(bidder, 1_000_000);
    lotId = await test.createLot(auctioneer, {
      startsAt: BASE,
      endsAt,
      startingBid: STARTING_BID,
      increment: INCREMENT,
    });
  });

  afterAll(async () => {
    await test.close();
  });

  it('aceita o lance com 201 e devolve seq, valor, alias, data e fim', async () => {
    const response = await test.bid(bidder, lotId, STARTING_BID);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      seq: 1,
      amount: STARTING_BID,
      alias: expect.stringMatching(/^Licitante [A-Z2-7]{6}$/) as unknown,
      createdAt: BASE.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  });

  it('compromete o valor do lance na carteira do licitante', async () => {
    await test.bid(bidder, lotId, STARTING_BID).expect(201);

    const response = await request(test.server)
      .get('/wallet')
      .auth(bidder.token, { type: 'bearer' })
      .expect(200);

    expect(response.body).toMatchObject({
      balance: 1_000_000,
      committed: STARTING_BID,
      available: 1_000_000 - STARTING_BID,
    });
  });

  it('recusa lance abaixo do mínimo com 422 e o mínimo aceito', async () => {
    await test.bid(bidder, lotId, STARTING_BID).expect(201);
    const rival = await test.signup('BIDDER');
    await test.deposit(rival, 1_000_000);

    const response = await test.bid(rival, lotId, STARTING_BID + 1);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      code: 'BID_BELOW_MINIMUM',
      minimum: STARTING_BID + INCREMENT,
    });
  });

  it('devolve o comprometido do licitante superado', async () => {
    const rival = await test.signup('BIDDER');
    await test.deposit(rival, 1_000_000);
    await test.bid(bidder, lotId, STARTING_BID).expect(201);
    await test.bid(rival, lotId, STARTING_BID + INCREMENT).expect(201);

    const wallets = await test.db.query<
      { userId: number; committed: number }[]
    >(
      `SELECT user_id AS "userId", committed FROM wallets
       WHERE user_id = ANY($1) ORDER BY user_id`,
      [[bidder.id, rival.id]],
    );

    expect(wallets).toEqual([
      { userId: bidder.id, committed: 0 },
      { userId: rival.id, committed: STARTING_BID + INCREMENT },
    ]);
  });

  it('lance nos últimos 2 min prorroga o fim em 2 min', async () => {
    test.clock.set(new Date(endsAt.getTime() - 60_000));
    await test.bid(bidder, lotId, STARTING_BID).expect(201);

    const [lot] = await test.db.query<{ endsAt: Date }[]>(
      'SELECT ends_at AS "endsAt" FROM lots WHERE id = $1',
      [lotId],
    );

    expect(lot.endsAt).toEqual(new Date(endsAt.getTime() + 2 * 60_000));
  });

  it('responde 403 ROLE_NOT_ALLOWED ao leiloeiro', async () => {
    const response = await test.bid(auctioneer, lotId, STARTING_BID);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ code: 'ROLE_NOT_ALLOWED' });
  });

  it('responde 401 sem token', async () => {
    await request(test.server)
      .post(`/lots/${lotId}/bids`)
      .send({ amount: STARTING_BID })
      .expect(401);
  });
});
