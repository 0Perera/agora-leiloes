import { DomainException } from '../common/domain.exception';
import {
  assertAvailable,
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

function makeLot(override: Partial<ListedLot> = {}): ListedLot {
  return { cancelledAt: null, endsAt: at(HOUR), ...override };
}

describe('scheduleErrors', () => {
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

describe('assertAvailable', () => {
  it('recusa peça em lote agendado ou ao vivo', () => {
    expect(() => assertAvailable([makeLot()], NOW)).toThrow(
      new DomainException('ARTWORK_ALREADY_LISTED'),
    );
  });

  it('aceita peça de lote cancelado', () => {
    const lot = makeLot({ cancelledAt: at(-HOUR) });

    expect(() => assertAvailable([lot], NOW)).not.toThrow();
  });

  it('aceita peça de lote encerrado', () => {
    const lot = makeLot({ endsAt: NOW });

    expect(() => assertAvailable([lot], NOW)).not.toThrow();
  });
});
