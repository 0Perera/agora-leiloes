import { Logger } from '@nestjs/common';
import { Clock } from '../common/clock';
import { SettlementService } from './settlement.service';
import { SettlementTimer } from './settlement.timer';

const NOW = new Date('2026-11-01T12:00:00.000Z');
const MAX_DELAY_MS = 2 ** 31 - 1;

type FakeLot = { id: number; endsAt: Date; settled: boolean };

function at(minutes: number): Date {
  return new Date(NOW.getTime() + minutes * 60_000);
}

function makeLot(override: Partial<FakeLot> = {}): FakeLot {
  return { id: 1, endsAt: at(10), settled: false, ...override };
}

class FakeSettlement {
  constructor(readonly lots: FakeLot[]) {}

  settle = jest.fn((id: number) => {
    const lot = this.lots.find((candidate) => candidate.id === id);
    if (lot) lot.settled = true;
    return Promise.resolve();
  });

  due = jest.fn((now: Date) =>
    Promise.resolve(
      this.open()
        .filter((lot) => lot.endsAt <= now)
        .map((lot) => lot.id),
    ),
  );

  next = jest.fn((now: Date): Promise<Date | null> => {
    const future = this.open()
      .map((lot) => lot.endsAt)
      .filter((endsAt) => endsAt > now)
      .sort((a, b) => a.getTime() - b.getTime());
    return Promise.resolve(future[0] ?? null);
  });

  private open(): FakeLot[] {
    return this.lots.filter((lot) => !lot.settled);
  }
}

function makeTimer(lots: FakeLot[]) {
  const settlement = new FakeSettlement(lots);
  const timer = new SettlementTimer(
    settlement as unknown as SettlementService,
    new Clock(),
  );
  return { timer, settlement };
}

function flush(): Promise<void> {
  return jest.advanceTimersByTimeAsync(0);
}

function until(date: Date): Promise<void> {
  return jest.advanceTimersByTimeAsync(date.getTime() - Date.now());
}

let timers: SettlementTimer[] = [];
let errors: jest.SpyInstance;

async function boot(lots: FakeLot[]) {
  const made = makeTimer(lots);
  timers.push(made.timer);
  made.timer.onApplicationBootstrap();
  await flush();
  return made;
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  errors = jest.spyOn(Logger.prototype, 'error').mockImplementation();
});

afterEach(() => {
  for (const timer of timers) timer.onModuleDestroy();
  timers = [];
  errors.mockRestore();
  jest.useRealTimers();
});

describe('SettlementTimer.onApplicationBootstrap', () => {
  it('liquida os lotes vencidos', async () => {
    const { settlement } = await boot([
      makeLot({ id: 1, endsAt: at(-30) }),
      makeLot({ id: 2, endsAt: at(-5) }),
      makeLot({ id: 3, endsAt: at(10) }),
    ]);

    expect(settlement.settle.mock.calls).toEqual([[1], [2]]);
  });

  it('arma o timer para o próximo fim futuro', async () => {
    const { settlement } = await boot([
      makeLot({ id: 1, endsAt: at(-5) }),
      makeLot({ id: 3, endsAt: at(10) }),
    ]);
    settlement.settle.mockClear();

    await until(at(10));

    expect(settlement.settle).toHaveBeenCalledWith(3);
  });

  it('registra no log o erro ao liquidar e termina de subir com o timer armado', async () => {
    const { timer, settlement } = makeTimer([
      makeLot({ id: 1, endsAt: at(-5) }),
      makeLot({ id: 2, endsAt: at(10) }),
    ]);
    timers.push(timer);
    settlement.settle.mockRejectedValueOnce(new Error('db down'));

    expect(() => timer.onApplicationBootstrap()).not.toThrow();
    await flush();

    expect(errors).toHaveBeenCalledWith(expect.stringContaining('lot 1'));
    expect(jest.getTimerCount()).toBe(1);
  });

  it('tenta de novo em 30 s quando a consulta do próximo fim falha', async () => {
    const { timer, settlement } = makeTimer([
      makeLot({ id: 1, endsAt: at(10) }),
    ]);
    timers.push(timer);
    settlement.next.mockRejectedValueOnce(new Error('db down'));

    timer.onApplicationBootstrap();
    await flush();
    expect(errors).toHaveBeenCalledWith(
      expect.stringContaining('next lot lookup failed'),
    );

    await jest.advanceTimersByTimeAsync(30_000);
    expect(settlement.next).toHaveBeenCalledTimes(2);

    await until(at(10));

    expect(settlement.settle).toHaveBeenCalledWith(1);
  });
});

describe('SettlementTimer.run', () => {
  it('agenda o lote que encerra durante a liquidação dos vencidos', async () => {
    const { timer, settlement } = makeTimer([
      makeLot({ id: 1, endsAt: at(-5) }),
      makeLot({ id: 2, endsAt: at(1) }),
    ]);
    timers.push(timer);
    settlement.settle.mockImplementationOnce((id: number) => {
      settlement.lots[0].settled = id === 1;
      jest.setSystemTime(at(2));
      return Promise.resolve();
    });

    timer.onApplicationBootstrap();
    await flush();
    await flush();

    expect(settlement.settle).toHaveBeenLastCalledWith(2);
  });

  it('liquida no mesmo disparo todos os lotes do mesmo instante', async () => {
    const { settlement } = await boot([
      makeLot({ id: 3, endsAt: at(10) }),
      makeLot({ id: 4, endsAt: at(10) }),
    ]);

    await until(at(10));

    expect(settlement.settle.mock.calls).toEqual([[3], [4]]);
  });

  it('não rearma o timer para o passado quando o lote não liquida', async () => {
    const { timer, settlement } = makeTimer([
      makeLot({ id: 1, endsAt: at(-5) }),
    ]);
    timers.push(timer);
    settlement.settle.mockResolvedValue(undefined);

    timer.onApplicationBootstrap();
    await flush();

    expect(settlement.settle).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('dispara no limite do setTimeout e reagenda o restante', async () => {
    const endsAt = at(30 * 24 * 60);
    const { settlement } = await boot([makeLot({ id: 1, endsAt })]);

    await jest.advanceTimersByTimeAsync(MAX_DELAY_MS);

    expect(settlement.settle).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);

    await until(endsAt);

    expect(settlement.settle).toHaveBeenCalledWith(1);
  });

  it('registra no log o erro de um lote e liquida os demais', async () => {
    const { settlement } = await boot([
      makeLot({ id: 1, endsAt: at(10) }),
      makeLot({ id: 2, endsAt: at(10) }),
    ]);
    settlement.settle.mockRejectedValueOnce(new Error('db down'));

    await until(at(10));

    expect(errors).toHaveBeenCalledWith(expect.stringContaining('lot 1'));
    expect(settlement.lots[1].settled).toBe(true);
  });

  it('deixa o timer seguinte armado depois do erro', async () => {
    const { settlement } = await boot([
      makeLot({ id: 1, endsAt: at(10) }),
      makeLot({ id: 2, endsAt: at(20) }),
    ]);
    settlement.settle.mockRejectedValueOnce(new Error('db down'));
    await until(at(10));

    await until(at(20));

    expect(settlement.settle).toHaveBeenLastCalledWith(2);
  });
});

describe('SettlementTimer.refresh', () => {
  it('não cancela o disparo já vencido', async () => {
    const { timer, settlement } = await boot([
      makeLot({ id: 1, endsAt: at(10) }),
    ]);
    jest.setSystemTime(at(10));

    timer.refresh();
    await flush();
    await jest.runOnlyPendingTimersAsync();

    expect(settlement.settle).toHaveBeenCalledWith(1);
  });

  it('antecipa o timer para um lote novo que encerra antes', async () => {
    const { timer, settlement } = await boot([
      makeLot({ id: 1, endsAt: at(60) }),
    ]);
    settlement.lots.push(makeLot({ id: 2, endsAt: at(10) }));

    timer.refresh();
    await until(at(10));

    expect(settlement.settle).toHaveBeenCalledWith(2);
  });

  it('adia o timer na prorrogação sem liquidar no fim antigo', async () => {
    const { timer, settlement } = await boot([
      makeLot({ id: 1, endsAt: at(10) }),
    ]);
    settlement.lots[0].endsAt = at(12);

    timer.refresh();
    await until(at(10));

    expect(settlement.settle).not.toHaveBeenCalled();

    await until(at(12));

    expect(settlement.settle).toHaveBeenCalledWith(1);
  });

  it('vale só o recálculo mais recente quando as respostas chegam fora de ordem', async () => {
    const { timer, settlement } = await boot([]);
    let older: (value: Date | null) => void = () => undefined;
    settlement.next
      .mockImplementationOnce(
        () => new Promise<Date | null>((resolve) => (older = resolve)),
      )
      .mockImplementationOnce(() => Promise.resolve(at(10)));

    timer.refresh();
    timer.refresh();
    await flush();
    older(at(60));
    await flush();
    settlement.lots.push(makeLot({ id: 2, endsAt: at(10) }));
    await until(at(10));

    expect(settlement.settle).toHaveBeenCalledWith(2);
  });
});

describe('SettlementTimer.onModuleDestroy', () => {
  it('não deixa timer pendente', async () => {
    const { timer } = await boot([makeLot({ id: 1, endsAt: at(10) })]);

    timer.onModuleDestroy();

    expect(jest.getTimerCount()).toBe(0);
  });
});
