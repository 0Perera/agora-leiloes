import { useCallback, useEffect, useState } from 'react';
import { api } from '../../shared/api/client';
import type {
  BookFilter,
  DashboardBook,
  DashboardSummary,
} from '../../shared/api/types';

export type Load<T> =
  | { status: 'loading'; data: T | null }
  | { status: 'error'; data: T | null }
  | { status: 'ready'; data: T };

export function useDashboard() {
  const [summary, setSummary] = useState<Load<DashboardSummary>>({
    status: 'loading',
    data: null,
  });
  const [book, setBook] = useState<Load<DashboardBook>>({
    status: 'loading',
    data: null,
  });
  const [filter, setFilter] = useState<BookFilter>('all');
  const [page, setPage] = useState(1);
  const [summaryAttempt, setSummaryAttempt] = useState(0);
  const [bookAttempt, setBookAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.dashboardSummary().then(
      (data) => active && setSummary({ status: 'ready', data }),
      () =>
        active && setSummary((current) => ({ ...current, status: 'error' })),
    );
    return () => {
      active = false;
    };
  }, [summaryAttempt]);

  useEffect(() => {
    let active = true;
    api.dashboardLots(filter, page).then(
      (data) => {
        if (!active) return;
        // a última linha da página pode sumir depois de um cancelamento
        if (data.items.length === 0 && page > 1) setPage(page - 1);
        else setBook({ status: 'ready', data });
      },
      () => active && setBook((current) => ({ ...current, status: 'error' })),
    );
    return () => {
      active = false;
    };
  }, [filter, page, bookAttempt]);

  const reload = useCallback(() => {
    setSummaryAttempt((current) => current + 1);
    setBookAttempt((current) => current + 1);
  }, []);

  const retrySummary = useCallback(() => {
    setSummary((current) => ({ ...current, status: 'loading' }));
    setSummaryAttempt((current) => current + 1);
  }, []);

  const retryBook = useCallback(() => {
    setBook((current) => ({ ...current, status: 'loading' }));
    setBookAttempt((current) => current + 1);
  }, []);

  const choose = useCallback((next: BookFilter) => {
    setBook((current) => ({ ...current, status: 'loading' }));
    setFilter(next);
    setPage(1);
    setBookAttempt((current) => current + 1);
  }, []);

  const turn = useCallback((next: number) => {
    setBook((current) => ({ ...current, status: 'loading' }));
    setPage(next);
    setBookAttempt((current) => current + 1);
  }, []);

  const showCreated = useCallback(() => {
    setBook((current) => ({ ...current, status: 'loading' }));
    setFilter('all');
    setPage(1);
    setSummaryAttempt((current) => current + 1);
    setBookAttempt((current) => current + 1);
  }, []);

  return {
    summary,
    book,
    filter,
    page,
    reload,
    retrySummary,
    retryBook,
    choose,
    turn,
    showCreated,
  };
}
