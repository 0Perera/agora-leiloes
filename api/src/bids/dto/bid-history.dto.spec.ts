import { toHistoryItem } from './bid-history.dto';

describe('toHistoryItem', () => {
  it('expõe só seq, alias, valor e data', () => {
    const row = {
      seq: 3,
      userId: 10,
      amount: 110_000,
      createdAt: new Date('2026-10-27T12:00:00Z'),
      name: 'Pessoa',
      email: 'pessoa@teste.dev',
    };

    const item = toHistoryItem(row, () => 'Licitante ABCDEF');

    expect(Object.keys(item)).toEqual(['seq', 'alias', 'amount', 'createdAt']);
  });
});
