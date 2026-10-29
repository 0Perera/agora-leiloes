import { INestApplication, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { getOptionsToken } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AddressInfo } from 'node:net';
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
import {
  databaseFactory,
  DatabaseModule,
} from '../src/database/database.module';
import { SettlementService } from '../src/settlement/settlement.service';
import { SettlementTimer } from '../src/settlement/settlement.timer';
import type { Role } from '../src/users/user.entity';

export const BASE = new Date('2026-11-01T12:00:00.000Z');
export const STARTING_BID = 100_000;
export const INCREMENT = 5_000;
export const DEPOSIT = 1_000_000;
const LOCK_TIMEOUT_MS = 10_000;
const POLL_MS = 20;
const UNLIMITED = [{ ttl: 60_000, limit: 1_000_000 }];

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

export class FakeCatalog implements Pick<CatalogService, 'find' | 'image'> {
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

// Sem hooks de ciclo de vida: nada liquida por timer no e2e, só conta os recálculos.
export class FakeTimer implements Pick<SettlementTimer, 'refresh'> {
  refreshes = 0;

  refresh(): void {
    this.refreshes += 1;
  }
}

// Mesmas opções de produção; o pool cobre os N lances, a barreira e a consulta ao pg_stat_activity.
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...databaseFactory(config),
        poolSize: 20,
      }),
    }),
  ],
})
class TestDatabaseModule {}

export type Account = { id: number; token: string };

export type StreamEvent = { type: string; data: unknown };

export type Stream = {
  status: number;
  events: StreamEvent[];
  waitFor(count: number): Promise<StreamEvent[]>;
  close(): void;
};

function parse(chunk: string): StreamEvent | null {
  const lines = chunk.split('\n');
  const type = lines.find((line) => line.startsWith('event: '))?.slice(7);
  const data = lines.find((line) => line.startsWith('data: '))?.slice(6);
  return type && data ? { type, data: JSON.parse(data) as unknown } : null;
}

async function read(response: Response, events: StreamEvent[]) {
  if (!response.body) return;
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for await (const bytes of response.body) {
      buffer += decoder.decode(bytes, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const event of chunks.map(parse)) if (event) events.push(event);
    }
  } catch {
    return;
  }
}

async function until<T>(check: () => T | undefined): Promise<T> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    const value = check();
    if (value !== undefined) return value;
    if (Date.now() > deadline) throw new Error('condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

export function eventually(check: () => boolean): Promise<true> {
  return until(() => (check() ? true : undefined));
}

export type LotDraft = {
  startsAt?: Date;
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
    readonly timer: FakeTimer,
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
    const startsAt = draft.startsAt ?? BASE;
    this.clock.set(startsAt);
    const response = await request(this.server)
      .post('/lots')
      .auth(auctioneer.token, { type: 'bearer' })
      .send({
        artworkId,
        startingBid: draft.startingBid ?? STARTING_BID,
        increment: draft.increment ?? INCREMENT,
        startsAt: startsAt.toISOString(),
        endsAt: draft.endsAt.toISOString(),
      })
      .expect(201);
    this.clock.set(BASE);
    return (response.body as { id: number }).id;
  }

  // Relógio no fim dos lotes de 30 min criados em BASE.
  async settle(...lotIds: number[]): Promise<void> {
    this.clock.set(at(30));
    const settlement = this.app.get(SettlementService);
    for (const lotId of lotIds) await settlement.settle(lotId);
  }

  bid(bidder: Account, lotId: number, amount: number): request.Test {
    return request(this.server)
      .post(`/lots/${lotId}/bids`)
      .auth(bidder.token, { type: 'bearer' })
      .send({ amount });
  }

  // fetch de verdade na porta do listen(0): o supertest espera a resposta terminar.
  async stream(lotId: number): Promise<Stream> {
    const { port } = this.server.address() as AddressInfo;
    const controller = new AbortController();
    const response = await fetch(
      `http://127.0.0.1:${port}/lots/${lotId}/stream`,
      { signal: controller.signal },
    );
    const events: StreamEvent[] = [];
    void read(response, events);
    return {
      status: response.status,
      events,
      waitFor: (count) =>
        until(() => (events.length >= count ? events : undefined)),
      close: () => controller.abort(),
    };
  }

  async close(): Promise<void> {
    await this.app.close();
  }
}

// Limite real do login só na suíte dele: as outras logam à vontade do mesmo IP.
export async function start({ throttle = false } = {}): Promise<TestApp> {
  const clock = new TestClock();
  const catalog = new FakeCatalog();
  const timer = new FakeTimer();
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideModule(DatabaseModule)
    .useModule(TestDatabaseModule)
    .overrideProvider(Clock)
    .useValue(clock)
    .overrideProvider(CatalogService)
    .useValue(catalog)
    .overrideProvider(SettlementTimer)
    .useValue(timer);
  if (!throttle) {
    builder.overrideProvider(getOptionsToken()).useValue(UNLIMITED);
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  setup(app);
  await app.listen(0);
  return new TestApp(
    app,
    app.getHttpServer(),
    clock,
    catalog,
    app.get(DataSource),
    timer,
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

// Conexão à parte segurando uma linha: os lances chegam e ficam na fila do lock.
async function hold(
  db: DataSource,
  sql: string,
  params: unknown[],
): Promise<Barrier> {
  const runner = db.createQueryRunner();
  await runner.connect();
  const [{ pid }] = (await runner.query('SELECT pg_backend_pid() AS pid')) as {
    pid: number;
  }[];
  await runner.startTransaction();
  await runner.query(sql, params);
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

export function lockLot(db: DataSource, lotId: number): Promise<Barrier> {
  return hold(db, 'SELECT id FROM lots WHERE id = $1 FOR UPDATE', [lotId]);
}

export function lockWallet(db: DataSource, userId: number): Promise<Barrier> {
  return hold(db, 'SELECT id FROM wallets WHERE user_id = $1 FOR UPDATE', [
    userId,
  ]);
}
