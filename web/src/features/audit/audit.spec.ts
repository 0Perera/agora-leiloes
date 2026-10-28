import { describe, expect, it } from 'vitest';
import type { AuditBid, BidMark, LotAudit } from '../../shared/api/types';
import { missingText, parseLookup, rowsOf, verdictOf } from './audit';

function makeBid(seq: number, mark: BidMark = 'intact'): AuditBid {
  return {
    seq,
    alias: 'Licitante ABCDEF',
    amount: 100_000 + seq * 5_000,
    createdAt: '2026-10-20T20:31:00.000Z',
    hash: 'a'.repeat(64),
    mark,
  };
}

function makeAudit(overrides: Partial<LotAudit> = {}): LotAudit {
  return {
    id: 1,
    number: 7,
    title: 'Natureza-morta com frutas',
    artist: 'Escola flamenga',
    status: 'ended',
    result: 'intact',
    brokenSeq: null,
    bids: [1, 2, 3].map((seq) => makeBid(seq)),
    ...overrides,
  };
}

function tamperedAt7(): LotAudit {
  return makeAudit({
    result: 'tampered',
    brokenSeq: 7,
    bids: [5, 6, 7, 8, 9].map((seq) =>
      makeBid(
        seq,
        seq < 7 ? 'intact' : seq === 7 ? 'tampered' : 'unverifiable',
      ),
    ),
  });
}

describe('verdictOf', () => {
  it('declara íntegro o histórico intacto', () => {
    const verdict = verdictOf(makeAudit());
    expect(verdict).toEqual({
      intact: true,
      title: 'Histórico íntegro',
      text: 'Os 3 lances estão em sequência, sem nenhuma quebra, e o último confere com o selo do lote. Nada foi alterado, apagado ou incluído depois.',
    });
  });

  it('explica o lote íntegro que ainda não recebeu lances', () => {
    const verdict = verdictOf(makeAudit({ bids: [] }));
    expect(verdict.text).toBe(
      'O lote ainda não recebeu lances. Quando receber, cada um entra na sequência e pode ser conferido aqui.',
    );
  });

  it('cita no título o lance alterado', () => {
    expect(verdictOf(tamperedAt7()).title).toBe(
      'Histórico adulterado no lance 7',
    );
  });

  it('acusa lances removidos do fim', () => {
    const verdict = verdictOf(makeAudit({ result: 'truncated' }));
    expect(verdict.title).toBe('Histórico adulterado: lances removidos do fim');
  });

  it('explica a remoção de todos os lances', () => {
    const verdict = verdictOf(makeAudit({ result: 'truncated', bids: [] }));
    expect(verdict.text).toBe(
      'Nenhum lance aparece no histórico, mas o selo do lote indica que houve lances. Isso indica que eles foram apagados.',
    );
  });

  it('acusa o comprovante que não confere com o histórico', () => {
    const verdict = verdictOf(makeAudit({ result: 'receipt_tampered' }));
    expect(verdict).toMatchObject({
      intact: false,
      title: 'Comprovante não confere com o histórico',
    });
  });
});

describe('rowsOf', () => {
  it('marca íntegros os lances do histórico intacto', () => {
    const labels = rowsOf(makeAudit()).map((row) => row.label);
    expect(labels).toEqual(['Íntegro', 'Íntegro', 'Íntegro']);
  });

  it('marca o lance alterado e os seguintes como não verificáveis', () => {
    const labels = rowsOf(tamperedAt7()).map((row) => row.label);
    expect(labels).toEqual([
      'Íntegro',
      'Íntegro',
      'Adulterado',
      'Não verificável',
      'Não verificável',
    ]);
  });

  it('põe a nota de dependência só no primeiro lance não verificável', () => {
    const notes = rowsOf(tamperedAt7()).map((row) => row.note);
    expect(notes.slice(3)).toEqual([
      'Depende do lance 7 e não pode ser confirmado.',
      null,
    ]);
  });
});

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
      'Lote XCIX não encontrado. Confira o número no card ou no comprovante.',
    );
  });
});
