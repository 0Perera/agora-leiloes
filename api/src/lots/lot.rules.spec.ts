import { DomainException } from '../common/domain.exception';
import {
  assertAvailable,
  CancelState,
  cancellation,
  ListedLot,
  Schedule,
  scheduleErrors,
} from './lot.rules';

const NOW = new Date('2026-10-26T12:00:00Z');
const HOUR = 60 * 60 * 1000;

function at(offsetMs: number): Date {
  return new Date(NOW.getTime() + offsetMs);
}

function makeSchedule(override: Partial<Schedule> = {}): Schedule {
  return { startsAt: at(HOUR), endsAt: at(2 * HOUR), ...override };
}

function makeListed(override: Partial<ListedLot> = {}): ListedLot {
  return { cancelledAt: null, endsAt: at(HOUR), ...override };
}

function makeCancelState(override: Partial<CancelState> = {}): CancelState {
  return { endsAt: at(2 * HOUR), last: null, ...override };
}

describe('lotRules.scheduleErrors', () => {
  it('recusa início mais de 1 min no passado', () => {
    expect(
      scheduleErrors(makeSchedule({ startsAt: at(-61_000) }), NOW),
    ).toEqual({ startsAt: 'notInPast' });
  });

  it('aceita início 30s no passado', () => {
    expect(
      scheduleErrors(makeSchedule({ startsAt: at(-30_000) }), NOW),
    ).toEqual({});
  });

  it('recusa fim igual ao início', () => {
    const schedule = makeSchedule({ startsAt: at(HOUR), endsAt: at(HOUR) });

    expect(scheduleErrors(schedule, NOW)).toEqual({ endsAt: 'afterStart' });
  });

  it('recusa fim no passado dentro da tolerância do início', () => {
    const schedule = makeSchedule({
      startsAt: at(-30_000),
      endsAt: at(-10_000),
    });

    expect(scheduleErrors(schedule, NOW)).toEqual({ endsAt: 'notInPast' });
  });

  it('recusa data que o Date não consegue ler', () => {
    const schedule = makeSchedule({ startsAt: new Date('2026-W44-1') });

    expect(scheduleErrors(schedule, NOW)).toEqual({ startsAt: 'isIso8601' });
  });
});

describe('lotRules.assertAvailable', () => {
  it('recusa peça em lote agendado ou ao vivo', () => {
    expect(() => assertAvailable([makeListed()], NOW)).toThrow(
      new DomainException('ARTWORK_ALREADY_LISTED'),
    );
  });

  it('aceita peça de lote cancelado', () => {
    const lot = makeListed({ cancelledAt: at(-HOUR) });

    expect(() => assertAvailable([lot], NOW)).not.toThrow();
  });

  it('aceita peça de lote encerrado', () => {
    const lot = makeListed({ endsAt: NOW });

    expect(() => assertAvailable([lot], NOW)).not.toThrow();
  });
});

describe('lotRules.cancellation', () => {
  it('aceita lote agendado sem estorno', () => {
    expect(cancellation(makeCancelState(), NOW)).toEqual({ release: null });
  });

  it('aceita lote ao vivo sem lances sem estorno', () => {
    const lot = makeCancelState({ endsAt: at(60_000) });

    expect(cancellation(lot, NOW)).toEqual({ release: null });
  });

  it('libera o comprometido do líder em lote ao vivo com lances', () => {
    const last = { userId: 7, amount: 150_000 };
    const lot = makeCancelState({ endsAt: at(60_000), last });

    expect(cancellation(lot, NOW)).toEqual({ release: last });
  });

  it('recusa lote encerrado com LOT_ENDED', () => {
    const lot = makeCancelState({ endsAt: NOW });

    expect(() => cancellation(lot, NOW)).toThrow(
      new DomainException('LOT_ENDED'),
    );
  });

  it('lote encerrado com lance recusa com LOT_ENDED', () => {
    const last = { userId: 7, amount: 150_000 };
    const lot = makeCancelState({ endsAt: at(-HOUR), last });

    expect(() => cancellation(lot, NOW)).toThrow(
      new DomainException('LOT_ENDED'),
    );
  });

  it('recusa lote encerrado com lance com LOT_ENDED', () => {
    const last = { userId: 7, amount: 150_000 };
    const lot = makeCancelState({ endsAt: NOW, last });

    expect(() => cancellation(lot, NOW)).toThrow(
      new DomainException('LOT_ENDED'),
    );
  });
});
