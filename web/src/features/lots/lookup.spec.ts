import { describe, expect, it } from 'vitest';
import { missingText, parseLookup } from './lookup';

describe('parseLookup', () => {
  it('lê o número romano minúsculo', () => {
    expect(parseLookup('vii')).toEqual({ number: 7 });
  });

  it('recusa o texto que não é número de lote', () => {
    expect(parseLookup('abc')).toEqual({
      error: 'Use o número do lote, como 7 ou VII.',
    });
  });

  it('pede o número quando o campo está vazio', () => {
    expect(parseLookup('  ')).toEqual({
      error: 'Informe o número do lote para auditar.',
    });
  });
});

describe('missingText', () => {
  it('cita o lote inexistente em romano', () => {
    expect(missingText(99)).toBe(
      'Lote XCIX · nº 99 não encontrado. Confira o número no card ou no comprovante.',
    );
  });
});
