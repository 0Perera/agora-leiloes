import request from 'supertest';
import { BidsService } from '../src/bids/bids.service';
import { DomainException } from '../src/common/domain.exception';
import { LOTS } from '../src/seed/plan';
import { SettlementService } from '../src/settlement/settlement.service';
import { seed } from '../src/seed/seed';
import { BASE, start, type TestApp } from './app';

type Counts = { users: number; lots: number; bids: number; receipts: number };

const TAMPERED = LOTS.find((plan) => plan.tamper);
const PLANNED: Counts = {
  users: 3,
  lots: LOTS.length,
  bids: LOTS.reduce((total, plan) => total + plan.bids.length, 0),
  receipts: LOTS.filter((plan) => plan.settle && plan.bids.length > 0).length,
};

let api: TestApp;

beforeAll(async () => {
  api = await start();
});

afterAll(async () => {
  await api.close();
});

async function counts(): Promise<Counts> {
  const [row] = await api.db.query<Counts[]>(
    `SELECT (SELECT COUNT(*) FROM users)::int AS users,
       (SELECT COUNT(*) FROM lots)::int AS lots,
       (SELECT COUNT(*) FROM bids)::int AS bids,
       (SELECT COUNT(*) FROM receipts)::int AS receipts`,
  );
  return row;
}

async function lotId(artworkId: number): Promise<number> {
  const [row] = await api.db.query<{ id: number }[]>(
    'SELECT id FROM lots WHERE artwork_id = $1',
    [artworkId],
  );
  return row.id;
}

async function audit(
  id: number,
): Promise<{ result: string; brokenSeq: number | null }> {
  const response = await request(api.server)
    .get(`/lots/${id}/audit`)
    .expect(200);
  return response.body as { result: string; brokenSeq: number | null };
}

describe('seed', () => {
  describe('banco vazio', () => {
    beforeAll(async () => {
      await api.reset();
      await seed(api.app);
    });

    it('cria o leiloeiro e os dois licitantes com os e-mails do seed', async () => {
      const users = await api.db.query<{ email: string; role: string }[]>(
        'SELECT email, role FROM users ORDER BY id',
      );

      expect(users).toEqual([
        { email: 'leiloeiro@agora.dev', role: 'AUCTIONEER' },
        { email: 'geovanna@agora.dev', role: 'BIDDER' },
        { email: 'felipe@agora.dev', role: 'BIDDER' },
      ]);
    });

    it('cria 4 lotes ao vivo, 2 agendados, 4 encerrados e 1 cancelado', async () => {
      const [row] = await api.db.query<Record<string, number>[]>(
        `SELECT
           COUNT(*) FILTER (WHERE cancelled_at IS NULL AND starts_at <= $1 AND ends_at > $1)::int AS live,
           COUNT(*) FILTER (WHERE cancelled_at IS NULL AND starts_at > $1)::int AS scheduled,
           COUNT(*) FILTER (WHERE cancelled_at IS NULL AND ends_at <= $1)::int AS ended,
           COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL)::int AS cancelled
         FROM lots`,
        [BASE],
      );

      expect(row).toEqual({ live: 4, scheduled: 2, ended: 4, cancelled: 1 });
    });

    it('auditoria dá íntegro em todo lote não adulterado', async () => {
      const lots = await api.db.query<{ id: number }[]>(
        'SELECT id FROM lots WHERE cancelled_at IS NULL AND artwork_id <> $1',
        [TAMPERED?.artworkId],
      );

      const results = await Promise.all(lots.map(({ id }) => audit(id)));

      expect(results).toHaveLength(9);
      expect(results.map(({ result }) => result)).toEqual(
        Array(9).fill('intact'),
      );
    });

    it('auditoria do lote adulterado aponta o lance alterado', async () => {
      const verdict = await audit(await lotId(TAMPERED?.artworkId ?? 0));

      expect(verdict).toMatchObject({
        result: 'tampered',
        brokenSeq: TAMPERED?.tamper?.seq,
      });
    });

    it('comprovantes dos lotes arrematados são válidos', async () => {
      const receipts = await api.db.query<{ token: string }[]>(
        'SELECT token FROM receipts',
      );

      const valid = await Promise.all(
        receipts.map(async ({ token }) => {
          const response = await request(api.server)
            .get(`/receipts/${token}`)
            .expect(200);
          return (response.body as { valid: boolean }).valid;
        }),
      );

      expect(valid).toEqual(Array(PLANNED.receipts).fill(true));
    });
  });

  it('segunda execução não cria usuário, lote, lance nem comprovante', async () => {
    await api.reset();
    await seed(api.app);

    await seed(api.app);

    expect(await counts()).toEqual(PLANNED);
  });

  it('execução interrompida no meio dos lotes completa na seguinte sem duplicar', async () => {
    await api.reset();
    const image = api.catalog.image.bind(api.catalog);
    let downloads = 0;
    const spy = jest.spyOn(api.catalog, 'image').mockImplementation(() => {
      downloads += 1;
      if (downloads === 5) {
        return Promise.reject(new DomainException('IMAGE_DOWNLOAD_FAILED'));
      }
      return image();
    });
    await expect(seed(api.app)).rejects.toThrow('IMAGE_DOWNLOAD_FAILED');
    spy.mockRestore();
    expect((await counts()).lots).toBe(4);

    await seed(api.app);

    expect(await counts()).toEqual(PLANNED);
  });

  it('não dá lance em lote já liquidado', async () => {
    await api.reset();
    const index = LOTS.findIndex((plan) => plan.settle && plan.bids.length > 0);
    const earlier = LOTS.slice(0, index).reduce(
      (total, plan) => total + plan.bids.length,
      0,
    );
    const bids = api.app.get(BidsService);
    const place = bids.place.bind(bids);
    let placed = 0;
    const spy = jest
      .spyOn(bids, 'place')
      .mockImplementation((userId, lot, amount) => {
        placed += 1;
        if (placed === earlier + 1) {
          return Promise.reject(new Error('interrompido'));
        }
        return place(userId, lot, amount);
      });
    await expect(seed(api.app)).rejects.toThrow('interrompido');
    spy.mockRestore();
    const id = await lotId(LOTS[index].artworkId);
    const [{ endsAt }] = await api.db.query<{ endsAt: Date }[]>(
      'SELECT ends_at AS "endsAt" FROM lots WHERE id = $1',
      [id],
    );
    api.clock.set(new Date(endsAt.getTime() + 60_000));
    await api.app.get(SettlementService).settle(id);
    api.clock.set(BASE);
    const before = await api.db.query<{ count: number }[]>(
      'SELECT COUNT(*)::int AS count FROM bids WHERE lot_id = $1',
      [id],
    );

    await seed(api.app);

    const after = await api.db.query<{ count: number }[]>(
      'SELECT COUNT(*)::int AS count FROM bids WHERE lot_id = $1',
      [id],
    );
    expect(after).toEqual(before);
    expect((await audit(id)).result).toBe('intact');
  });

  it('catálogo fora do ar não grava nada', async () => {
    await api.reset();
    const spy = jest
      .spyOn(api.catalog, 'find')
      .mockRejectedValue(new DomainException('CATALOG_UNAVAILABLE'));

    await expect(seed(api.app)).rejects.toThrow('Cleveland indisponível');
    spy.mockRestore();

    expect(await counts()).toEqual({ users: 0, lots: 0, bids: 0, receipts: 0 });
  });
});
