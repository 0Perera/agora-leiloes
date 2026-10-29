import request from 'supertest';
import {
  type Account,
  at,
  BASE,
  DEPOSIT,
  INCREMENT,
  start,
  STARTING_BID,
  type TestApp,
} from './app';

type Section = 'ongoing' | 'won' | 'lost';

type Page = {
  items: Record<string, unknown>[];
  total: number;
  counts: Record<Section, number>;
};

let api: TestApp;
let auctioneer: Account;
let bidder: Account;
let rival: Account;

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
});

afterAll(async () => {
  await api.close();
});

function myBids(account: Account | undefined, section: Section) {
  const call = request(api.server).get(`/my-bids?section=${section}`);
  return account ? call.auth(account.token, { type: 'bearer' }) : call;
}

async function page(section: Section, account = bidder): Promise<Page> {
  const response = await myBids(account, section).expect(200);
  return response.body as Page;
}

async function token(lotId: number): Promise<string> {
  const [row] = await api.db.query<{ token: string }[]>(
    'SELECT token FROM receipts WHERE lot_id = $1',
    [lotId],
  );
  return row.token;
}

describe('GET /my-bids em andamento', () => {
  it('meu lance por último aparece como ganhando', async () => {
    const lotId = await api.createLot(auctioneer, { endsAt: at(60) });
    await api.bid(bidder, lotId, STARTING_BID).expect(201);

    expect((await page('ongoing')).items).toEqual([
      expect.objectContaining({
        id: lotId,
        artist: 'Artista de teste',
        situation: 'winning',
        awaitingSettlement: false,
        myBid: STARTING_BID,
      }),
    ]);
  });

  it('lance coberto por rival aparece como superado', async () => {
    const lotId = await api.createLot(auctioneer, { endsAt: at(60) });
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    await api.bid(rival, lotId, STARTING_BID + INCREMENT).expect(201);

    expect((await page('ongoing')).items).toEqual([
      expect.objectContaining({
        situation: 'outbid',
        currentBid: STARTING_BID + INCREMENT,
      }),
    ]);
  });

  it('lote encerrado sem liquidar fica aguardando liquidação', async () => {
    const lotId = await api.createLot(auctioneer, { endsAt: at(30) });
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    api.clock.set(at(30));

    expect((await page('ongoing')).items).toEqual([
      expect.objectContaining({ id: lotId, awaitingSettlement: true }),
    ]);
  });
});

describe('GET /my-bids encerrados', () => {
  it('vencedor vê o lote em arrematados com valor, data e token', async () => {
    const lotId = await api.createLot(auctioneer, { endsAt: at(30) });
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    await api.settle(lotId);

    expect((await page('won')).items).toEqual([
      {
        id: lotId,
        number: expect.any(Number) as number,
        artworkId: expect.any(Number) as number,
        title: expect.any(String) as string,
        artist: 'Artista de teste',
        amount: STARTING_BID,
        settledAt: at(30).toISOString(),
        receiptToken: await token(lotId),
      },
    ]);
  });

  it('vencedor não vê o lote liquidado em andamento', async () => {
    const lotId = await api.createLot(auctioneer, { endsAt: at(30) });
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    await api.settle(lotId);

    expect((await page('ongoing')).items).toEqual([]);
  });

  it('perdedor vê o valor final e o seu maior lance', async () => {
    const lotId = await api.createLot(auctioneer, { endsAt: at(30) });
    await api.bid(rival, lotId, STARTING_BID).expect(201);
    await api.bid(bidder, lotId, STARTING_BID + INCREMENT).expect(201);
    await api.settle(lotId);

    expect((await page('lost', rival)).items).toEqual([
      expect.objectContaining({
        id: lotId,
        artist: 'Artista de teste',
        amount: STARTING_BID + INCREMENT,
        myBid: STARTING_BID,
        settledAt: at(30).toISOString(),
      }),
    ]);
  });
});

describe('GET /my-bids cancelados', () => {
  function cancel(lotId: number): request.Test {
    return request(api.server)
      .post(`/lots/${lotId}/cancel`)
      .auth(auctioneer.token, { type: 'bearer' })
      .expect(204);
  }

  it('lote cancelado sai de ongoing e entra em lost em GET /my-bids', async () => {
    const lotId = await api.createLot(auctioneer, { endsAt: at(60) });
    await api.bid(bidder, lotId, STARTING_BID).expect(201);

    await cancel(lotId);

    expect((await page('ongoing')).items).toEqual([]);
    expect((await page('lost')).items).toEqual([
      expect.objectContaining({
        id: lotId,
        amount: null,
        myBid: STARTING_BID,
        settledAt: null,
        cancelledAt: BASE.toISOString(),
      }),
    ]);
  });

  it('lote cancelado nunca aparece em arrematados, mesmo depois do fim original', async () => {
    const lotId = await api.createLot(auctioneer, { endsAt: at(30) });
    await api.bid(rival, lotId, STARTING_BID).expect(201);
    await api.bid(bidder, lotId, STARTING_BID + INCREMENT).expect(201);
    await cancel(lotId);

    await api.settle(lotId);

    for (const account of [bidder, rival]) {
      expect((await page('won', account)).items).toEqual([]);
      expect((await page('lost', account)).items).toEqual([
        expect.objectContaining({ id: lotId }),
      ]);
    }
  });
});

describe('GET /my-bids contagens', () => {
  it('counts somam todos os lotes em que o licitante deu lance', async () => {
    const live = await api.createLot(auctioneer, { endsAt: at(60) });
    const won = await api.createLot(auctioneer, { endsAt: at(30) });
    const lost = await api.createLot(auctioneer, { endsAt: at(30) });
    await api.bid(bidder, live, STARTING_BID).expect(201);
    await api.bid(rival, live, STARTING_BID + INCREMENT).expect(201);
    await api.bid(bidder, live, STARTING_BID + 2 * INCREMENT).expect(201);
    await api.bid(bidder, won, STARTING_BID).expect(201);
    await api.bid(bidder, lost, STARTING_BID).expect(201);
    await api.bid(rival, lost, STARTING_BID + INCREMENT).expect(201);
    await api.settle(won, lost);

    expect((await page('ongoing')).counts).toEqual({
      ongoing: 1,
      won: 1,
      lost: 1,
    });
  });

  it('lote sem lance do licitante não aparece', async () => {
    const other = await api.createLot(auctioneer, { endsAt: at(60) });
    await api.bid(rival, other, STARTING_BID).expect(201);

    const pages = await Promise.all(
      (['ongoing', 'won', 'lost'] as const).map((section) => page(section)),
    );

    expect(pages.flatMap((result) => result.items)).toEqual([]);
  });
});

describe('GET /my-bids privacidade e acesso', () => {
  it('resposta não traz id de usuário, nome ou e-mail', async () => {
    const live = await api.createLot(auctioneer, { endsAt: at(60) });
    const sold = await api.createLot(auctioneer, { endsAt: at(30) });
    await api.bid(bidder, live, STARTING_BID).expect(201);
    await api.bid(bidder, sold, STARTING_BID).expect(201);
    await api.settle(sold);

    const bodies = JSON.stringify([await page('ongoing'), await page('won')]);

    expect(bodies).not.toMatch(/userId|Pessoa|@teste\.dev/);
  });

  it('leiloeiro recebe 403', async () => {
    const response = await myBids(auctioneer, 'ongoing').expect(403);

    expect(response.body).toEqual({ code: 'ROLE_NOT_ALLOWED' });
  });

  it('visitante recebe 401', async () => {
    await myBids(undefined, 'ongoing').expect(401);
  });
});
