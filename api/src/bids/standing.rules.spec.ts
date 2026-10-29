import { BidderTop, standing } from './standing.rules';

const ANA = 1;
const BIA = 2;
const CAIO = 3;

function makeTop(userId: number, highest: number): BidderTop {
  return { userId, highest };
}

describe('standing', () => {
  it('devolve nulo para quem não deu lance', () => {
    const tops = [makeTop(BIA, 5_000)];

    expect(standing(tops, ANA)).toBeNull();
  });

  it('coloca o líder em 1º', () => {
    const tops = [makeTop(ANA, 5_500), makeTop(BIA, 5_000)];

    expect(standing(tops, ANA)?.rank).toBe(1);
  });

  it('conta como posição os licitantes com maior lance acima do seu', () => {
    const tops = [
      makeTop(ANA, 6_000),
      makeTop(BIA, 5_500),
      makeTop(CAIO, 5_000),
    ];

    expect(standing(tops, CAIO)?.rank).toBe(3);
  });

  it('conta o total de licitantes distintos', () => {
    const tops = [
      makeTop(ANA, 6_000),
      makeTop(BIA, 5_500),
      makeTop(CAIO, 5_000),
    ];

    expect(standing(tops, BIA)?.bidders).toBe(3);
  });

  it('devolve o maior lance do usuário', () => {
    const tops = [makeTop(ANA, 6_000), makeTop(BIA, 5_500)];

    expect(standing(tops, BIA)?.highest).toBe(5_500);
  });
});
