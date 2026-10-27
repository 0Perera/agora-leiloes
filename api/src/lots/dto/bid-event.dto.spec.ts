import { toBidEvent } from './bid-event.dto';

describe('toBidEvent', () => {
  it('expõe só seq, valor, alias, data e fim', () => {
    const bid = {
      seq: 1,
      amount: 100_000,
      alias: 'Licitante ABCDEF',
      createdAt: new Date('2026-10-27T12:00:00Z'),
      endsAt: new Date('2026-10-28T12:00:00Z'),
      userId: 10,
      name: 'Pessoa',
      email: 'pessoa@teste.dev',
    };

    expect(Object.keys(toBidEvent(bid))).toEqual([
      'seq',
      'amount',
      'alias',
      'createdAt',
      'endsAt',
    ]);
  });
});
