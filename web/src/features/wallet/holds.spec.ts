import { describe, expect, it } from 'vitest';
import { heldNote, holdNote, moreLots } from './holds';

describe('moreLots', () => {
  it('não mostra nada quando o total cabe na lista', () => {
    expect(moreLots(20, 20)).toBeNull();
  });

  it('mostra um lote a mais no singular', () => {
    expect(moreLots(21, 20)).toBe('e mais 1 lote');
  });

  it('mostra os lotes a mais no plural', () => {
    expect(moreLots(23, 20)).toBe('e mais 3 lotes');
  });
});

describe('heldNote', () => {
  it('diz que nada está reservado sem lotes', () => {
    expect(heldNote(0)).toBe('nada reservado agora');
  });

  it('conta um lote no singular', () => {
    expect(heldNote(1)).toBe('reservado em 1 lote que você lidera');
  });

  it('conta os lotes no plural', () => {
    expect(heldNote(2)).toBe('reservado em 2 lotes que você lidera');
  });
});

describe('holdNote', () => {
  it('mostra aguardando liquidação no lote já encerrado', () => {
    const now = Date.parse('2026-10-27T20:00:00.000Z');

    expect(holdNote('2026-10-27T19:00:00.000Z', now).detail).toBe(
      'aguardando liquidação',
    );
  });
});
