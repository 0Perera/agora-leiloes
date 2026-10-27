import request from 'supertest';
import { SettlementService } from '../src/settlement/settlement.service';
import { type Account, at, BASE, start, type TestApp } from './app';

const STARTING_BID = 100_000;
const INCREMENT = 5_000;
const DEPOSIT = 1_000_000;

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

function createLot(endsAt = at(60)): Promise<number> {
  return api.createLot(auctioneer, {
    startsAt: BASE,
    endsAt,
    startingBid: STARTING_BID,
    increment: INCREMENT,
  });
}

async function settle(...lotIds: number[]): Promise<void> {
  api.clock.set(at(30));
  for (const lotId of lotIds)
    await api.app.get(SettlementService).settle(lotId);
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
    const lotId = await createLot();
    await api.bid(bidder, lotId, STARTING_BID).expect(201);

    expect((await page('ongoing')).items).toEqual([
      expect.objectContaining({
        id: lotId,
        situation: 'winning',
        awaitingSettlement: false,
        myBid: STARTING_BID,
      }),
    ]);
  });

  it('lance coberto por rival aparece como superado', async () => {
    const lotId = await createLot();
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
    const lotId = await createLot(at(30));
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    api.clock.set(at(30));

    expect((await page('ongoing')).items).toEqual([
      expect.objectContaining({ id: lotId, awaitingSettlement: true }),
    ]);
  });
});

describe('GET /my-bids encerrados', () => {
  it('vencedor vê o lote em arrematados com valor, data e token', async () => {
    const lotId = await createLot(at(30));
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    await settle(lotId);

    expect((await page('won')).items).toEqual([
      {
        id: lotId,
        number: expect.any(Number) as number,
        title: expect.any(String) as string,
        amount: STARTING_BID,
        settledAt: at(30).toISOString(),
        receiptToken: await token(lotId),
      },
    ]);
  });

  it('vencedor não vê o lote liquidado em andamento', async () => {
    const lotId = await createLot(at(30));
    await api.bid(bidder, lotId, STARTING_BID).expect(201);
    await settle(lotId);

    expect((await page('ongoing')).items).toEqual([]);
  });

  it('perdedor vê o valor final e o seu maior lance', async () => {
    const lotId = await createLot(at(30));
    await api.bid(rival, lotId, STARTING_BID).expect(201);
    await api.bid(bidder, lotId, STARTING_BID + INCREMENT).expect(201);
    await settle(lotId);

    expect((await page('lost', rival)).items).toEqual([
      expect.objectContaining({
        id: lotId,
        amount: STARTING_BID + INCREMENT,
        myBid: STARTING_BID,
        settledAt: at(30).toISOString(),
      }),
    ]);
  });
});

describe('GET /my-bids contagens', () => {
  it('counts somam todos os lotes em que o licitante deu lance', async () => {
    const live = await createLot();
    const won = await createLot(at(30));
    const lost = await createLot(at(30));
    await api.bid(bidder, live, STARTING_BID).expect(201);
    await api.bid(rival, live, STARTING_BID + INCREMENT).expect(201);
    await api.bid(bidder, live, STARTING_BID + 2 * INCREMENT).expect(201);
    await api.bid(bidder, won, STARTING_BID).expect(201);
    await api.bid(bidder, lost, STARTING_BID).expect(201);
    await api.bid(rival, lost, STARTING_BID + INCREMENT).expect(201);
    await settle(won, lost);

    expect((await page('ongoing')).counts).toEqual({
      ongoing: 1,
      won: 1,
      lost: 1,
    });
  });

  it('lote sem lance do licitante não aparece', async () => {
    const other = await createLot();
    await api.bid(rival, other, STARTING_BID).expect(201);

    const pages = await Promise.all(
      (['ongoing', 'won', 'lost'] as const).map((section) => page(section)),
    );

    expect(pages.flatMap((result) => result.items)).toEqual([]);
  });
});

describe('GET /my-bids privacidade e acesso', () => {
  it('resposta não traz id de usuário, nome ou e-mail', async () => {
    const live = await createLot();
    const sold = await createLot(at(30));
    await api.bid(bidder, live, STARTING_BID).expect(201);
    await api.bid(bidder, sold, STARTING_BID).expect(201);
    await settle(sold);

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
