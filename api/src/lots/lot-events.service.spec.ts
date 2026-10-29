import { MessageEvent } from '@nestjs/common';
import { HEARTBEAT_MS, LotEventsService } from './lot-events.service';

function makeEvent() {
  return {
    seq: 1,
    amount: 100_000,
    alias: 'Licitante ABCDEF',
    createdAt: new Date('2026-10-27T12:00:00Z'),
    endsAt: new Date('2026-10-28T12:00:00Z'),
  };
}

describe('LotEventsService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('entrega o evento só aos ouvintes do lote', () => {
    const events = new LotEventsService();
    const lot1: MessageEvent[] = [];
    const lot2: MessageEvent[] = [];
    const first = events.stream(1).subscribe((event) => lot1.push(event));
    const second = events.stream(2).subscribe((event) => lot2.push(event));

    events.bid(1, makeEvent());
    first.unsubscribe();
    second.unsubscribe();

    expect(lot1).toEqual([{ type: 'bid', data: makeEvent() }]);
    expect(lot2).toEqual([]);
  });

  it('remove o ouvinte ao desinscrever', () => {
    const events = new LotEventsService();
    const subscription = events.stream(1).subscribe();

    subscription.unsubscribe();

    expect(events.listeners(1)).toBe(0);
  });

  it('manda heartbeat a cada 25 s', () => {
    jest.useFakeTimers();
    const events = new LotEventsService();
    const received: MessageEvent[] = [];
    const subscription = events
      .stream(1)
      .subscribe((event) => received.push(event));

    jest.advanceTimersByTime(HEARTBEAT_MS * 2);
    subscription.unsubscribe();

    expect(received).toEqual([
      { comment: 'heartbeat' },
      { comment: 'heartbeat' },
    ]);
  });
});
