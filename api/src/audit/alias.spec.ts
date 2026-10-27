import { forLot } from './alias';

const SECRET = 'test-secret-with-at-least-32-chars!';

describe('alias.forLot', () => {
  it('gera o mesmo alias para o mesmo licitante no mesmo lote', () => {
    expect(forLot(SECRET, 42, 7)).toBe(forLot(SECRET, 42, 7));
  });

  it('gera aliases diferentes para o mesmo licitante em lotes diferentes', () => {
    expect(forLot(SECRET, 42, 7)).not.toBe(forLot(SECRET, 42, 8));
  });

  it('usa "Licitante " seguido de 6 caracteres em base32', () => {
    expect(forLot(SECRET, 42, 7)).toMatch(/^Licitante [A-Z2-7]{6}$/);
  });
});
