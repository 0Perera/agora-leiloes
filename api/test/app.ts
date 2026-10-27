import { INestApplication, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setup } from '../src/app.setup';
import type { ArtworkDetail } from '../src/catalog/artwork.mapper';
import { CatalogService } from '../src/catalog/catalog.service';
import type { ImageFile } from '../src/catalog/cleveland.client';
import { Clock } from '../src/common/clock';
import { Env } from '../src/config/env.validation';
import { DatabaseModule } from '../src/database/database.module';
import { databaseOptions } from '../src/database/database.options';
import type { Role } from '../src/users/user.entity';

export const BASE = new Date('2026-11-01T12:00:00.000Z');
const LOCK_TIMEOUT_MS = 10_000;
const POLL_MS = 20;

export function at(minutes: number): Date {
  return new Date(BASE.getTime() + minutes * 60_000);
}

export function secret(): string {
  const value = process.env.BID_HMAC_SECRET;
  if (!value) throw new Error('BID_HMAC_SECRET missing');
  return value;
}

export class TestClock extends Clock {
  private current = BASE;

  now(): Date {
    return new Date(this.current);
  }

  set(date: Date): void {
    this.current = date;
  }
}

export class FakeCatalog {
  private readonly titles = new Map<number, string>();

  title(artworkId: number, title: string): void {
    this.titles.set(artworkId, title);
  }

  find(id: number): Promise<ArtworkDetail> {
    return Promise.resolve({
      id,
      title: this.titles.get(id) ?? `Obra ${id}`,
      artist: 'Artista de teste',
      date: '1650',
      type: 'Painting',
      technique: 'oil on canvas',
      imageUrl: `https://cleveland.invalid/${id}.jpg`,
      accessionNumber: `1900.${id}`,
      measurements: '10 x 10 cm',
      description: null,
      department: 'European Painting and Sculpture',
    });
  }

  image(): Promise<ImageFile> {
    return Promise.resolve({
      contentType: 'image/jpeg',
      bytes: Buffer.from([0xff, 0xd8, 0xff]),
    });
  }
}

// Mesmas opções de produção; o pool cobre os N lances, a barreira e a consulta ao pg_stat_activity.
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...databaseOptions({
          DATABASE_URL: config.get('DATABASE_URL', { infer: true }),
          DB_SSL: config.get('DB_SSL', { infer: true }),
        }),
        migrationsRun: true,
        poolSize: 20,
      }),
    }),
  ],
})
class TestDatabaseModule {}

export type Account = { id: number; token: string };

export type LotDraft = {
  startsAt: Date;
  endsAt: Date;
  startingBid?: number;
  increment?: number;
  title?: string;
};

export class TestApp {
  private emails = 0;
  private artworks = 0;

  constructor(
    readonly app: INestApplication,
    readonly server: Server,
    readonly clock: TestClock,
    readonly catalog: FakeCatalog,
    readonly db: DataSource,
  ) {}

  async reset(): Promise<void> {
    const tables = await this.db.query<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'`,
    );
    const names = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
    await this.db.query(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
    this.clock.set(BASE);
  }

  async signup(role: Role): Promise<Account> {
    this.emails += 1;
    const response = await request(this.server)
      .post('/auth/signup')
      .send({
        name: `Pessoa ${this.emails}`,
        email: `pessoa${this.emails}@teste.dev`,
        password: 'senha-de-teste',
        role,
      })
      .expect(201);
    const body = response.body as { token: string; user: { id: number } };
    return { id: body.user.id, token: body.token };
  }

  async deposit(account: Account, amount: number): Promise<void> {
    await request(this.server)
      .post('/wallet/deposits')
      .auth(account.token, { type: 'bearer' })
      .send({ amount })
      .expect(201);
  }

  // Criado na hora do início, como o leiloeiro faria; o relógio volta para BASE depois.
  async createLot(auctioneer: Account, draft: LotDraft): Promise<number> {
    this.artworks += 1;
    const artworkId = this.artworks;
    if (draft.title) this.catalog.title(artworkId, draft.title);
    this.clock.set(draft.startsAt);
    const response = await request(this.server)
      .post('/lots')
      .auth(auctioneer.token, { type: 'bearer' })
      .send({
        artworkId,
        startingBid: draft.startingBid ?? 100_000,
        increment: draft.increment ?? 5_000,
        startsAt: draft.startsAt.toISOString(),
        endsAt: draft.endsAt.toISOString(),
      })
      .expect(201);
    this.clock.set(BASE);
    return (response.body as { id: number }).id;
  }

  bid(bidder: Account, lotId: number, amount: number): request.Test {
    return request(this.server)
      .post(`/lots/${lotId}/bids`)
      .auth(bidder.token, { type: 'bearer' })
      .send({ amount });
  }

  async close(): Promise<void> {
    await this.app.close();
  }
}

export async function start(): Promise<TestApp> {
  const clock = new TestClock();
  const catalog = new FakeCatalog();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideModule(DatabaseModule)
    .useModule(TestDatabaseModule)
    .overrideProvider(Clock)
    .useValue(clock)
    .overrideProvider(CatalogService)
    .useValue(catalog)
    .compile();
  const app = moduleRef.createNestApplication();
  setup(app);
  await app.listen(0);
  return new TestApp(
    app,
    app.getHttpServer() as Server,
    clock,
    catalog,
    app.get(DataSource),
  );
}

// Recursivo: só o primeiro da fila espera a barreira; os outros esperam quem está à frente.
async function lockWaiters(db: DataSource, barrier: Barrier): Promise<number> {
  const [row] = await db.query<{ waiters: number }[]>(
    `WITH RECURSIVE queue(pid) AS (
       SELECT pid FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))
       UNION
       SELECT a.pid FROM pg_stat_activity a
       JOIN queue q ON q.pid = ANY(pg_blocking_pids(a.pid))
     )
     SELECT COUNT(DISTINCT a.pid)::int AS waiters
     FROM queue q JOIN pg_stat_activity a ON a.pid = q.pid
     WHERE a.datname = current_database() AND a.wait_event_type = 'Lock'`,
    [barrier.pid],
  );
  return row.waiters;
}

// Prova de simultaneidade: só volta quando N backends distintos estão parados no lock da barreira.
export async function waitForLockWaiters(
  db: DataSource,
  barrier: Barrier,
  expected: number,
): Promise<number> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    const waiters = await lockWaiters(db, barrier);
    if (waiters >= expected) return waiters;
    if (Date.now() > deadline) {
      throw new Error(
        `only ${waiters} of ${expected} requests waiting on lock`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

export type Barrier = {
  pid: number;
  release(): Promise<void>;
  abort(): Promise<void>;
};

// Conexão à parte segurando a linha do lote: os lances chegam e ficam na fila do lock.
export async function lockLot(db: DataSource, lotId: number): Promise<Barrier> {
  const runner = db.createQueryRunner();
  await runner.connect();
  const [{ pid }] = (await runner.query('SELECT pg_backend_pid() AS pid')) as {
    pid: number;
  }[];
  await runner.startTransaction();
  await runner.query('SELECT id FROM lots WHERE id = $1 FOR UPDATE', [lotId]);
  return {
    pid,
    release: async () => {
      await runner.commitTransaction();
      await runner.release();
    },
    abort: async () => {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      if (!runner.isReleased) await runner.release();
    },
  };
}
