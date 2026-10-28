import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/api/client';
import { failure } from './use-receipt';

describe('failure', () => {
  it('trata o token inexistente como comprovante não encontrado', () => {
    expect(failure(new ApiError(404))).toEqual({ status: 'missing' });
  });

  it('trata as demais falhas como erro', () => {
    expect(failure(new ApiError(500))).toEqual({ status: 'error' });
  });
});
