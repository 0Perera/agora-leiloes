import { INestApplicationContext, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { BidsService } from '../bids/bids.service';
import { lastBid } from '../bids/last-bid';
import { CatalogService } from '../catalog/catalog.service';
import { Clock } from '../common/clock';
import { Lot } from '../lots/lot.entity';
import { LotsService } from '../lots/lots.service';
import { SettlementService } from '../settlement/settlement.service';
import { UsersService } from '../users/users.service';
import { WalletsService } from '../wallets/wallets.service';
import { ACCOUNTS, type AccountKey, BIDDERS, PASSWORD } from './accounts';
import { DEPOSIT, LOTS, type LotPlan, SETTLE_DELAY } from './plan';

const CATALOG_DOWN =
  'Cleveland indisponível: nada foi gravado. Rode o seed de novo em alguns minutos.';

type Users = Record<AccountKey, number>;

type Tamper = NonNullable<LotPlan['tamper']>;

type SeededLot = Pick<
  Lot,
  'id' | 'startsAt' | 'endsAt' | 'cancelledAt' | 'settledAt'
>;

// Sem API nova no Clock: a instância global é trocada só durante a ação (D-045).
async function travel<T>(
  clock: Clock,
  at: Date,
  action: () => Promise<T>,
): Promise<T> {
  const now = clock.now.bind(clock);
  clock.now = () => new Date(at);
  try {
    return await action();
  } finally {
    clock.now = now;
  }
}

function shift(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

// Cada passo confere o que já existe: rodar de novo completa o que faltou sem duplicar.
class Seeder {
  private readonly logger = new Logger('Seed');
  private readonly clock: Clock;
  private readonly db: DataSource;

  constructor(private readonly app: INestApplicationContext) {
    this.clock = app.get(Clock);
    this.db = app.get(DataSource);
  }

  async run(): Promise<void> {
    const start = this.clock.now();
    await this.checkCatalog();
    const users = await this.accounts();
    await this.fund(users);
    for (const plan of LOTS) await this.lot(plan, users, start);
    this.logger.log(`${LOTS.length} lotes prontos`);
  }

  // Antes de qualquer escrita: com a Cleveland fora, nada fica pela metade.
  private async checkCatalog(): Promise<void> {
    const catalog = this.app.get(CatalogService);
    for (const { artworkId } of LOTS) {
      const artwork = await catalog.find(artworkId).catch(() => {
        throw new Error(CATALOG_DOWN);
      });
      if (!artwork) throw new Error(`obra ${artworkId} não encontrada`);
    }
  }

  private async accounts(): Promise<Users> {
    const users = this.app.get(UsersService);
    const auth = this.app.get(AuthService);
    const ids: Partial<Users> = {};
    for (const key of Object.keys(ACCOUNTS) as AccountKey[]) {
      const account = ACCOUNTS[key];
      const existing = await users.findByEmail(account.email);
      ids[key] =
        existing?.id ??
        (await auth.signup({ ...account, password: PASSWORD })).user.id;
    }
    return ids as Users;
  }

  private async fund(users: Users): Promise<void> {
    const wallets = this.app.get(WalletsService);
    for (const bidder of BIDDERS) {
      const { balance } = await wallets.find(users[bidder]);
      if (balance === 0) await wallets.deposit(users[bidder], DEPOSIT);
    }
  }

  private async lot(plan: LotPlan, users: Users, start: Date): Promise<void> {
    const auctioneerId = users.auctioneer;
    const lot =
      (await this.find(auctioneerId, plan.artworkId)) ??
      (await this.create(plan, auctioneerId, start));
    // Lote já liquidado não recebe lance: o comprometido nunca seria liberado.
    if (lot.settledAt === null) await this.bids(plan, lot, users);
    if (plan.cancelAfter !== undefined && lot.cancelledAt === null) {
      const at = shift(lot.startsAt, plan.cancelAfter);
      await travel(this.clock, at, () =>
        this.app.get(LotsService).cancel(auctioneerId, lot.id),
      );
    }
    if (plan.settle && lot.settledAt === null) {
      const at = shift(lot.endsAt, SETTLE_DELAY);
      await travel(this.clock, at, () =>
        this.app.get(SettlementService).settle(lot.id),
      );
    }
    if (plan.tamper) await this.tamper(lot.id, plan.tamper, plan);
  }

  private find(auctioneerId: number, artworkId: number) {
    return this.db.getRepository(Lot).findOne({
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        cancelledAt: true,
        settledAt: true,
      },
      where: { auctioneerId, artworkId },
      order: { id: 'ASC' },
    });
  }

  // Lote do passado nasce na hora do início, como o leiloeiro faria naquele dia.
  private async create(
    plan: LotPlan,
    auctioneerId: number,
    start: Date,
  ): Promise<SeededLot> {
    const startsAt = shift(start, plan.startsIn);
    const endsAt = shift(startsAt, plan.duration);
    const at = startsAt < start ? startsAt : start;
    const created = await travel(this.clock, at, () =>
      this.app.get(LotsService).create(auctioneerId, {
        artworkId: plan.artworkId,
        startingBid: plan.startingBid,
        increment: plan.increment,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      }),
    );
    this.logger.log(`lote ${created.number}: ${created.title}`);
    return {
      id: created.id,
      startsAt,
      endsAt,
      cancelledAt: null,
      settledAt: null,
    };
  }

  private async bids(plan: LotPlan, lot: SeededLot, users: Users) {
    const last = await lastBid(this.db.manager, lot.id);
    const service = this.app.get(BidsService);
    for (const bid of plan.bids.slice(last?.seq ?? 0)) {
      const at = shift(lot.startsAt, bid.after);
      await travel(this.clock, at, () =>
        service.place(users[bid.bidder], lot.id, bid.amount),
      );
    }
  }

  // Única escrita fora dos services: a adulteração que a auditoria deve apontar.
  private async tamper(
    lotId: number,
    { seq, amount }: Tamper,
    plan: LotPlan,
  ): Promise<void> {
    await this.db.query(
      'UPDATE bids SET amount = $1 WHERE lot_id = $2 AND seq = $3 AND amount = $4',
      [amount, lotId, seq, plan.bids[seq - 1].amount],
    );
  }
}

export function seed(app: INestApplicationContext): Promise<void> {
  return new Seeder(app).run();
}
