import request from 'supertest';
import { type Account, at, BASE, start, type TestApp } from './app';

type Card = { id: number };
type Showcase = {
  items: Card[];
  counts: { live: number; scheduled: number; ended: number };
};

describe('vitrine', () => {
  let test: TestApp;
  let auctioneer: Account;

  function live(endsAt: Date, title?: string): Promise<number> {
    return test.createLot(auctioneer, { startsAt: BASE, endsAt, title });
  }

  function scheduled(startsAt: Date, title?: string): Promise<number> {
    const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
    return test.createLot(auctioneer, { startsAt, endsAt, title });
  }

  function ended(endsAt: Date, title?: string): Promise<number> {
    return test.createLot(auctioneer, { startsAt: at(-300), endsAt, title });
  }

  async function featured(): Promise<request.Response> {
    return request(test.server).get('/lots/featured');
  }

  async function showcase(query: Record<string, string>): Promise<Showcase> {
    const response = await request(test.server)
      .get('/lots')
      .query(query)
      .expect(200);
    return response.body as Showcase;
  }

  beforeAll(async () => {
    test = await start();
  });

  beforeEach(async () => {
    await test.reset();
    auctioneer = await test.signup('AUCTIONEER');
  });

  afterAll(async () => {
    await test.close();
  });

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
    const bidder = await test.signup('BIDDER');
    await test.deposit(bidder, 1_000_000);
    const ending = await live(at(60));
    const richer = await live(at(120));
    await test.bid(bidder, ending, 100_000).expect(201);
    await test.bid(bidder, richer, 150_000).expect(201);

    const response = await featured();

    expect(response.body).toMatchObject({ id: richer, currentBid: 150_000 });
  });

  it('lote cancelado fica fora de GET /lots, /lots/featured e /lots/:id (404)', async () => {
    const lotId = await scheduled(at(60));
    await request(test.server)
      .post(`/lots/${lotId}/cancel`)
      .auth(auctioneer.token, { type: 'bearer' })
      .expect(204);

    const list = await showcase({ status: 'scheduled' });
    expect(list.items).toEqual([]);
    expect(list.counts.scheduled).toBe(0);
    expect((await featured()).status).toBe(204);
    await request(test.server).get(`/lots/${lotId}`).expect(404);
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
