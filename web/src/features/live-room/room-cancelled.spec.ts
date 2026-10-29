import { describe, expect, it } from 'vitest';
import { cancelledText } from './room-cancelled';

const me = { alias: 'Licitante AAAAAA', hasBid: true };

describe('cancelledText', () => {
  it('avisa o líder que o saldo comprometido foi devolvido', () => {
    expect(cancelledText({ me }, { alias: me.alias })).toBe(
      'Lote cancelado pelo leiloeiro. Seu saldo comprometido foi devolvido.',
    );
  });

  it('avisa o licitante superado só do cancelamento', () => {
    expect(cancelledText({ me }, { alias: 'Licitante BBBBBB' })).toBe(
      'Lote cancelado pelo leiloeiro.',
    );
  });

  it('avisa o visitante só do cancelamento', () => {
    expect(cancelledText({}, { alias: me.alias })).toBe(
      'Lote cancelado pelo leiloeiro.',
    );
  });
});
