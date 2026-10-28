import request from 'supertest';
import { SettlementService } from '../src/settlement/settlement.service';
import { type Account, at, BASE, start, type TestApp } from './app';

const STARTING_BID = 100_000;
const INCREMENT = 5_000;

type AuditBid = { seq: number; alias: string; mark: string };
type Audit = {
  result: string;
  brokenSeq: number | null;
  bids: AuditBid[];
};

let api: TestApp;
let auctioneer: Account;
let first: Account;
let second: Account;

beforeAll(async () => {
  api = await start();
});

beforeEach(async () => {
  await api.reset();
  auctioneer = await api.signup('AUCTIONEER');
  first = await api.signup('BIDDER');
  second = await api.signup('BIDDER');
  await api.deposit(first, 1_000_000);
  await api.deposit(second, 1_000_000);
});

afterAll(async () => {
  await api.close();
});

async function lotWithBids(count: number): Promise<number> {
  const lotId = await api.createLot(auctioneer, {
    startsAt: BASE,
    endsAt: at(30),
    startingBid: STARTING_BID,
    increment: INCREMENT,
  });
  for (let index = 0; index < count; index++) {
    const bidder = index % 2 === 0 ? first : second;
    await api.bid(bidder, lotId, STARTING_BID + index * INCREMENT).expect(201);
  }
  return lotId;
}

function audit(lotId: number | string): request.Test {
  return request(api.server).get(`/lots/${lotId}/audit`);
}

async function verdict(lotId: number): Promise<Audit> {
  const response = await audit(lotId).expect(200);
  return response.body as Audit;
}

describe('GET /lots/:id/audit', () => {
  it('declara íntegro o lote sem alteração', async () => {
    const lotId = await lotWithBids(3);

    const response = await audit(lotId).expect(200);

    expect(response.body).toEqual({
      id: lotId,
      number: expect.any(Number) as number,
      title: expect.any(String) as string,
      status: 'live',
      result: 'intact',
      brokenSeq: null,
      bids: [1, 2, 3].map((seq) => ({
        seq,
        alias: expect.stringMatching(/^Licitante [A-Z2-7]{6}$/) as string,
        amount: STARTING_BID + (seq - 1) * INCREMENT,
        createdAt: BASE.toISOString(),
        hash: expect.stringMatching(/^[0-9a-f]{64}$/) as string,
        mark: 'intact',
      })),
    });
  });

  it('não traz dado pessoal', async () => {
    const lotId = await lotWithBids(2);

    const response = await audit(lotId).expect(200);

    expect(JSON.stringify(response.body)).not.toMatch(
      /userId|user_id|Pessoa|@teste\.dev/,
    );
  });

  it('acusa o valor alterado no banco', async () => {
    const lotId = await lotWithBids(3);
    await api.db.query(
      'UPDATE bids SET amount = amount + 1 WHERE lot_id = $1 AND seq = 2',
      [lotId],
    );

    const body = await verdict(lotId);

    expect(body.result).toBe('tampered');
    expect(body.brokenSeq).toBe(2);
    expect(body.bids.map((bid) => bid.mark)).toEqual([
      'intact',
      'tampered',
      'unverifiable',
    ]);
  });

  it('acusa o último lance apagado no banco', async () => {
    const lotId = await lotWithBids(3);
    await api.db.query('DELETE FROM bids WHERE lot_id = $1 AND seq = 3', [
      lotId,
    ]);

    const body = await verdict(lotId);

    expect(body.result).toBe('truncated');
    expect(body.bids.map((bid) => bid.mark)).toEqual(['intact', 'intact']);
  });

  it('acusa o hash final do comprovante alterado no banco', async () => {
    const lotId = await lotWithBids(2);
    api.clock.set(at(30));
    await api.app.get(SettlementService).settle(lotId);
    await api.db.query(
      `UPDATE receipts SET final_hash = repeat('f', 64) WHERE lot_id = $1`,
      [lotId],
    );

    expect((await verdict(lotId)).result).toBe('receipt_tampered');
  });

  it('declara íntegro o lote liquidado com comprovante', async () => {
    const lotId = await lotWithBids(2);
    api.clock.set(at(30));
    await api.app.get(SettlementService).settle(lotId);

    expect((await verdict(lotId)).result).toBe('intact');
  });

  it('dispara duas queries para qualquer número de lances', async () => {
    const lotId = await lotWithBids(4);
    const spy = jest.spyOn(api.db.logger, 'logQuery');

    await audit(lotId).expect(200);

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('responde 404 para lote inexistente', async () => {
    await audit(999).expect(404);
  });

  it('responde 404 para lote cancelado', async () => {
    const lotId = await lotWithBids(0);
    await request(api.server)
      .post(`/lots/${lotId}/cancel`)
      .auth(auctioneer.token, { type: 'bearer' })
      .expect(204);

    await audit(lotId).expect(404);
  });
});
