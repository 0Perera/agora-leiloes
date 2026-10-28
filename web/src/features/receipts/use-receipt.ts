import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../../shared/api/client';
import type { Receipt } from '../../shared/api/types';

export type ReceiptState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ready'; receipt: Receipt; checkedAt: Date };

function failure(caught: unknown): ReceiptState {
  const missing = caught instanceof ApiError && caught.status === 404;
  return { status: missing ? 'missing' : 'error' };
}

export function useReceipt(token: string) {
  const [state, setState] = useState<ReceiptState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.receipt(token).then(
      (receipt) =>
        active && setState({ status: 'ready', receipt, checkedAt: new Date() }),
      (caught: unknown) => active && setState(failure(caught)),
    );
    return () => {
      active = false;
    };
  }, [token, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  return { state, retry };
}
