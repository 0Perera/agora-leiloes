import { describe, expect, it } from 'vitest';
import { actionOf, finalOf, leftOf, standingOf } from './my-bids';

describe('standingOf', () => {
  it('mostra que o licitante está ganhando no lote ao vivo', () => {
    const row = { situation: 'winning', awaitingSettlement: false } as const;
    expect(standingOf(row)).toEqual({
      tone: 'winning',
      mark: '▲',
      text: 'Você está ganhando',
    });
  });

  it('mostra que o licitante foi superado', () => {
    const row = { situation: 'outbid', awaitingSettlement: false } as const;
    expect(standingOf(row)).toEqual({
      tone: 'outbid',
      mark: '▼',
      text: 'Você foi superado',
    });
  });

  it('mostra o arremate aguardando liquidação a quem liderava no fim', () => {
    const row = { situation: 'winning', awaitingSettlement: true } as const;
    expect(standingOf(row).text).toBe('Você arrematou · aguardando liquidação');
  });

  it('mantém superado no lote encerrado sem liquidar', () => {
    const row = { situation: 'outbid', awaitingSettlement: true } as const;
    expect(standingOf(row).text).toBe('Você foi superado');
  });
});

describe('leftOf', () => {
  it('mostra o tempo restante', () => {
    expect(leftOf(false, 842)).toEqual({ text: '14:02', urgent: false });
  });

  it('marca como urgente abaixo de 2 minutos', () => {
    expect(leftOf(false, 95)).toEqual({ text: '01:35', urgent: true });
  });

  it('mostra encerrando quando a contagem zera', () => {
    expect(leftOf(false, 0)).toEqual({ text: 'encerrando', urgent: false });
  });

  it('mostra aguardando liquidação no lugar do tempo do lote vencido', () => {
    expect(leftOf(true, 0)).toEqual({
      text: 'Aguardando liquidação',
      urgent: false,
    });
  });
});

describe('actionOf', () => {
  it('oferece cobrir o lance a quem foi superado', () => {
    const row = { situation: 'outbid', awaitingSettlement: false } as const;
    expect(actionOf(row, 95)).toBe('Cobrir lance');
  });

  it('oferece abrir a sala a quem lidera', () => {
    const row = { situation: 'winning', awaitingSettlement: false } as const;
    expect(actionOf(row, 95)).toBe('Abrir sala');
  });

  it('oferece abrir a sala no lote encerrado sem liquidar', () => {
    const row = { situation: 'outbid', awaitingSettlement: true } as const;
    expect(actionOf(row, 0)).toBe('Abrir sala');
  });

  it('oferece abrir a sala quando a contagem zera sem recarregar', () => {
    const row = { situation: 'outbid', awaitingSettlement: false } as const;
    expect(actionOf(row, 0)).toBe('Abrir sala');
  });
});

describe('finalOf', () => {
  it('mostra o valor final com centavos', () => {
    expect(finalOf(1820050)).toBe('R$ 18.200,50');
  });

  it('mostra traço sem valor final', () => {
    expect(finalOf(null)).toBe('—');
  });
});
