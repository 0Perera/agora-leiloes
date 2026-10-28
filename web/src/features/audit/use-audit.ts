import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../../shared/api/client';
import type { LotAudit } from '../../shared/api/types';

export type AuditState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | {
      status: 'ready';
      audit: LotAudit;
      checkedAt: Date;
      checking: boolean;
      failed: boolean;
    };

function failure(caught: unknown): AuditState {
  const missing = caught instanceof ApiError && caught.status === 404;
  return { status: missing ? 'missing' : 'error' };
}

// falha no "Verificar de novo" mantém o veredito anterior e só avisa abaixo do botão
export function afterFailure(current: AuditState, caught: unknown): AuditState {
  if (current.status === 'ready' && current.checking)
    return { ...current, checking: false, failed: true };
  return failure(caught);
}

export function useAudit(id: number) {
  const [state, setState] = useState<AuditState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.audit(id).then(
      (audit) =>
        active &&
        setState({
          status: 'ready',
          audit,
          checkedAt: new Date(),
          checking: false,
          failed: false,
        }),
      (caught: unknown) =>
        active && setState((current) => afterFailure(current, caught)),
    );
    return () => {
      active = false;
    };
  }, [id, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  const recheck = useCallback(() => {
    setState((current) =>
      current.status === 'ready'
        ? { ...current, checking: true, failed: false }
        : current,
    );
    setAttempt((current) => current + 1);
  }, []);

  return { state, retry, recheck };
}
