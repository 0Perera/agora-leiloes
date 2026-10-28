import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/api/client';
import type { LotAudit } from '../../shared/api/types';
import { afterFailure } from './use-audit';
import type { AuditState } from './use-audit';

function makeReady(checking: boolean): AuditState {
  const audit: LotAudit = {
    id: 4,
    number: 4,
    title: 'Retrato',
    artist: 'Rembrandt',
    status: 'ended',
    result: 'intact',
    brokenSeq: null,
    bids: [],
  };
  const checkedAt = new Date('2026-10-28T12:00:00Z');
  return { status: 'ready', audit, checkedAt, checking, failed: false };
}

describe('afterFailure', () => {
  it('mantém o veredito anterior quando o verificar de novo falha', () => {
    expect(afterFailure(makeReady(true), new ApiError(500))).toEqual({
      ...makeReady(false),
      failed: true,
    });
  });

  it('mostra a tela de erro quando a primeira verificação falha', () => {
    expect(afterFailure({ status: 'loading' }, new ApiError(500))).toEqual({
      status: 'error',
    });
  });
});
