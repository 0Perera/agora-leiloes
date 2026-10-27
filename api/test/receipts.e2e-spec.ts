import request from 'supertest';
import { SettlementService } from '../src/settlement/settlement.service';
import { type Account, at, BASE, start, type TestApp } from './app';

const STARTING_BID = 100_000;
const INCREMENT = 5_000;
const DEPOSIT = 1_000_000;

type DashboardLot = { id: number; result: unknown };

let api: TestApp;
let auctioneer: Account;
let bidder: Account;

beforeAll(async () => {
  api = await start();
});

beforeEach(async () => {
  await api.reset();
  auctioneer = await api.signup('AUCTIONEER');
  bidder = await api.signup('BIDDER');
  await api.deposit(bidder, DEPOSIT);
});

afterAll(async () => {
  await api.close();
});

function createLot(owner = auctioneer, endsAt = at(30)): Promise<number> {
  return api.createLot(owner, {
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

async function sell(owner = auctioneer, amount = STARTING_BID) {
  const lotId = await createLot(owner);
  const placed = await api.bid(bidder, lotId, amount).expect(201);
  await settle(lotId);
  const [row] = await api.db.query<{ token: string; finalHash: string }[]>(
    `SELECT r.token, b.hash AS "finalHash"
     FROM receipts r JOIN bids b ON b.lot_id = r.lot_id
     WHERE r.lot_id = $1`,
    [lotId],
  );
  return { lotId, alias: (placed.body as { alias: string }).alias, ...row };
}

function receipt(token: string): request.Test {
  return request(api.server).get(`/receipts/${token}`);
}

function dashboard(path: string, owner = auctioneer): request.Test {
  return request(api.server)
    .get(`/dashboard/${path}`)
    .auth(owner.token, { type: 'bearer' })
    .expect(200);
}

describe('GET /receipts/:token', () => {
  it('devolve o comprovante com os campos e valid verdadeiro', async () => {
    const sold = await sell();

    const response = await receipt(sold.token).expect(200);

    expect(response.body).toEqual({
      lotId: sold.lotId,
      number: expect.any(Number) as number,
      title: expect.any(String) as string,
      artist: 'Artista de teste',
      amount: STARTING_BID,
      alias: sold.alias,
      settledAt: at(30).toISOString(),
      finalHash: sold.finalHash,
      valid: true,
    });
  });

  it('valor alterado no banco sai com valid falso', async () => {
    const sold = await sell();
    await api.db.query(
      'UPDATE receipts SET amount = amount + 1 WHERE lot_id = $1',
      [sold.lotId],
    );

    const response = await receipt(sold.token).expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({ amount: STARTING_BID + 1, valid: false }),
    );
  });

  it('token bem formado e inexistente responde 404', async () => {
    await receipt('A'.repeat(43)).expect(404);
  });

  it('resposta não traz dado pessoal', async () => {
    const sold = await sell();

    const response = await receipt(sold.token).expect(200);

    expect(JSON.stringify(response.body)).not.toMatch(
      /userId|winner|Pessoa|@teste\.dev/,
    );
  });
});

describe('painel do leiloeiro', () => {
  it('received soma só os comprovantes dos lotes do leiloeiro', async () => {
    const other = await api.signup('AUCTIONEER');
    await sell(auctioneer, STARTING_BID);
    await sell(auctioneer, STARTING_BID + INCREMENT);
    await sell(other, STARTING_BID * 2);

    const response = await dashboard('summary');

    expect((response.body as { received: number }).received).toBe(
      STARTING_BID * 2 + INCREMENT,
    );
  });

  it('book traz o resultado conforme a liquidação do lote', async () => {
    const sold = await sell();
    const empty = await createLot();
    const live = await createLot(auctioneer, at(60));
    await settle(empty);

    const response = await dashboard('lots');
    const items = (response.body as { items: DashboardLot[] }).items;
    const result = (id: number) => items.find((lot) => lot.id === id)?.result;

    expect(result(sold.lotId)).toEqual({
      alias: sold.alias,
      amount: STARTING_BID,
      receiptToken: sold.token,
    });
    expect(result(empty)).toEqual({
      alias: null,
      amount: null,
      receiptToken: null,
    });
    expect(result(live)).toBeNull();
  });
});
