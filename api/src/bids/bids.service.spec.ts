import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, In, IsNull } from 'typeorm';
import { forLot } from '../audit/alias';
import { GENESIS, hashBid, sealLot } from '../audit/chain';
import { DomainCode, DomainException } from '../common/domain.exception';
import { Env } from '../config/env.validation';
import { Lot } from '../lots/lot.entity';
import { Wallet } from '../wallets/wallet.entity';
import { Bid } from './bid.entity';
import { BidsService } from './bids.service';

const SECRET = 'test-secret';
const NOW = new Date('2026-10-26T12:00:00Z');
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const config = {
  get: () => SECRET,
} as unknown as ConfigService<Env, true>;

type LotRow = Pick<
  Lot,
  'id' | 'startsAt' | 'endsAt' | 'startingBid' | 'increment'
> &
  Partial<Pick<Lot, 'currentBid' | 'bidCount'>>;
type LastBid = Pick<Bid, 'seq' | 'userId' | 'amount' | 'hash'>;
type WalletRow = Pick<Wallet, 'id' | 'userId' | 'balance' | 'committed'>;

function at(offsetMs: number): Date {
  return new Date(NOW.getTime() + offsetMs);
}

function makeLot(override: Partial<LotRow> = {}): LotRow {
  return {
    id: 1,
    startsAt: at(-HOUR),
    endsAt: at(HOUR),
    startingBid: 100_000,
    increment: 5_000,
    ...override,
  };
}

function makeBid(override: Partial<LastBid> = {}): LastBid {
  return {
    seq: 3,
    userId: 20,
    amount: 120_000,
    hash: 'a'.repeat(64),
    ...override,
  };
}

function makeWallet(override: Partial<WalletRow> = {}): WalletRow {
  return { id: 1, userId: 10, balance: 500_000, committed: 0, ...override };
}

function makeService(
  state: {
    lot?: LotRow | null;
    last?: LastBid | null;
    wallets?: WalletRow[];
  } = {},
) {
  const { lot = makeLot(), last = null, wallets = [makeWallet()] } = state;
  const lots = {
    findOne: jest.fn().mockResolvedValue(lot),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const bids = {
    findOne: jest.fn().mockResolvedValue(last),
    insert: jest.fn().mockResolvedValue(undefined),
  };
  const walletRepository = {
    find: jest.fn().mockResolvedValue(wallets),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const repositories = new Map<unknown, unknown>([
    [Lot, lots],
    [Bid, bids],
    [Wallet, walletRepository],
  ]);
  const manager = {
    getRepository: (entity: unknown) => repositories.get(entity),
  };
  const dataSource = {
    transaction: (fn: (manager: unknown) => Promise<unknown>) => fn(manager),
  };
  const clock = { now: jest.fn(() => NOW) };
  const service = new BidsService(
    dataSource as unknown as DataSource,
    clock,
    config,
  );
  return { service, lots, bids, wallets: walletRepository, clock };
}

describe('BidsService.place', () => {
  it('responde 404 quando o lote não existe ou está cancelado', async () => {
    const { service, lots } = makeService({ lot: null });

    await expect(service.place(10, 1, 100_000)).rejects.toThrow(
      NotFoundException,
    );
    expect(lots.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, cancelledAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      }),
    );
  });

  it('lê a hora do Clock depois de travar o lote', async () => {
    const { service, lots, clock } = makeService();

    await service.place(10, 1, 100_000);

    expect(lots.findOne.mock.invocationCallOrder[0]).toBeLessThan(
      clock.now.mock.invocationCallOrder[0],
    );
  });

  it('trava uma carteira só quando o licitante já é o líder', async () => {
    const { service, wallets } = makeService({
      last: makeBid({ userId: 10 }),
    });

    await expect(service.place(10, 1, 200_000)).rejects.toThrow(
      new DomainException('ALREADY_WINNING'),
    );
    expect(wallets.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: In([10]) } }),
    );
  });

  it('trava as carteiras do licitante e do líder anterior em ordem de id', async () => {
    const { service, wallets } = makeService({
      last: makeBid({ userId: 20 }),
      wallets: [
        makeWallet({ id: 1, userId: 10 }),
        makeWallet({ id: 2, userId: 20, committed: 120_000 }),
      ],
    });

    await service.place(10, 1, 125_000);

    expect(wallets.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: In([10, 20]) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      }),
    );
  });

  it('recusa com o código e o detalhe da regra sem gravar nada', async () => {
    const { service, lots, bids, wallets } = makeService();

    const error: unknown = await service
      .place(10, 1, 50_000)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DomainException);
    expect(error).toMatchObject({
      code: 'BID_BELOW_MINIMUM',
      detail: { minimum: 100_000 },
    });
    expect(bids.insert).not.toHaveBeenCalled();
    expect(lots.update).not.toHaveBeenCalled();
    expect(wallets.update).not.toHaveBeenCalled();
  });

  it.each<[DomainCode, Parameters<typeof makeService>[0], number]>([
    ['ALREADY_WINNING', { last: makeBid({ userId: 10 }) }, 200_000],
    ['INSUFFICIENT_BALANCE', {}, 600_000],
    ['LOT_NOT_STARTED', { lot: makeLot({ startsAt: at(HOUR) }) }, 100_000],
    ['LOT_ENDED', { lot: makeLot({ endsAt: at(-MINUTE) }) }, 100_000],
  ])('recusa com %s sem gravar nada', async (code, state, amount) => {
    const { service, lots, bids, wallets } = makeService(state);

    await expect(service.place(10, 1, amount)).rejects.toThrow(
      new DomainException(code),
    );
    expect(bids.insert).not.toHaveBeenCalled();
    expect(lots.update).not.toHaveBeenCalled();
    expect(wallets.update).not.toHaveBeenCalled();
  });

  it('grava o primeiro lance com seq 1, hash anterior genesis e data do Clock', async () => {
    const { service, bids } = makeService();

    await service.place(10, 1, 100_000);

    const link = {
      lotId: 1,
      seq: 1,
      userId: 10,
      amount: 100_000,
      createdAt: NOW,
      prevHash: GENESIS,
    };
    expect(bids.insert).toHaveBeenCalledWith({
      ...link,
      hash: hashBid(SECRET, link),
    });
  });

  it('encadeia o lance no hash do último lance com o seq seguinte', async () => {
    const last = makeBid({ seq: 3, hash: 'b'.repeat(64) });
    const { service, bids } = makeService({
      last,
      wallets: [
        makeWallet(),
        makeWallet({ id: 2, userId: 20, committed: 120_000 }),
      ],
    });

    await service.place(10, 1, 125_000);

    const link = {
      lotId: 1,
      seq: 4,
      userId: 10,
      amount: 125_000,
      createdAt: NOW,
      prevHash: last.hash,
    };
    expect(bids.insert).toHaveBeenCalledWith({
      ...link,
      hash: hashBid(SECRET, link),
    });
  });

  it('atualiza selo, lance atual, contagem e fim do lote', async () => {
    const endsAt = at(MINUTE);
    const { service, lots } = makeService({ lot: makeLot({ endsAt }) });

    await service.place(10, 1, 100_000);

    const hash = hashBid(SECRET, {
      lotId: 1,
      seq: 1,
      userId: 10,
      amount: 100_000,
      createdAt: NOW,
      prevHash: GENESIS,
    });
    expect(lots.update).toHaveBeenCalledWith(
      { id: 1 },
      {
        currentBid: 100_000,
        bidCount: 1,
        endsAt: new Date(endsAt.getTime() + 2 * MINUTE),
        seal: sealLot(SECRET, { lotId: 1, count: 1, lastHash: hash }),
      },
    );
  });

  it('devolve o lance com o alias, a data do Clock e o fim prorrogado', async () => {
    const endsAt = at(MINUTE);
    const { service } = makeService({ lot: makeLot({ endsAt }) });

    const bid = await service.place(10, 1, 100_000);

    expect(bid).toEqual({
      seq: 1,
      amount: 100_000,
      alias: forLot(SECRET, 10, 1),
      createdAt: NOW,
      endsAt: new Date(endsAt.getTime() + 2 * MINUTE),
    });
  });

  it('libera o comprometido do líder anterior e compromete o novo lance', async () => {
    const { service, wallets } = makeService({
      last: makeBid({ userId: 20, amount: 120_000 }),
      wallets: [
        makeWallet({ id: 1, userId: 10, committed: 0 }),
        makeWallet({ id: 2, userId: 20, committed: 120_000 }),
      ],
    });

    await service.place(10, 1, 125_000);

    expect(wallets.update).toHaveBeenCalledWith(2, { committed: 0 });
    expect(wallets.update).toHaveBeenCalledWith(1, { committed: 125_000 });
  });

  it('licitante superado que volta compromete o valor cheio do novo lance', async () => {
    const { service, wallets } = makeService({
      last: makeBid({ userId: 20, amount: 105_000 }),
      wallets: [
        makeWallet({ id: 1, userId: 10, committed: 0 }),
        makeWallet({ id: 2, userId: 20, committed: 105_000 }),
      ],
    });

    await service.place(10, 1, 110_000);

    expect(wallets.update).toHaveBeenCalledWith(1, { committed: 110_000 });
  });

  it('calcula o mínimo pelo último lance, não pela cópia do lote', async () => {
    const { service, bids } = makeService({
      lot: makeLot({ currentBid: 300_000, bidCount: 9 }),
      last: makeBid({ userId: 20, amount: 120_000 }),
      wallets: [
        makeWallet(),
        makeWallet({ id: 2, userId: 20, committed: 120_000 }),
      ],
    });

    await service.place(10, 1, 125_000);

    expect(bids.insert).toHaveBeenCalledWith(
      expect.objectContaining({ seq: 4, amount: 125_000 }),
    );
  });
});
