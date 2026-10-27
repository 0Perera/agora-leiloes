import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../shared/api/client';
import type { LotShowcase, LotStatus } from '../../shared/api/types';
import { parseSearch, searchTab } from './showcase-search';

export type Load<T> =
  | { status: 'loading'; data: T | null }
  | { status: 'error'; data: T | null }
  | { status: 'ready'; data: T };

const searchDelay = 300;

export function useShowcase() {
  const [showcase, setShowcase] = useState<Load<LotShowcase>>({
    status: 'loading',
    data: null,
  });
  const [tab, setTab] = useState<LotStatus>('live');
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  const [attempt, setAttempt] = useState(0);
  const picking = useRef(false);
  const filter = parseSearch(term);

  const startLoading = useCallback(
    () => setShowcase((current) => ({ ...current, status: 'loading' })),
    [],
  );

  useEffect(() => {
    const next = text.trim();
    if (next === term) return;
    const timer = setTimeout(() => {
      startLoading();
      picking.current = next !== '';
      setTerm(next);
      setPage(1);
      if (next === '') setTab('live');
    }, searchDelay);
    return () => clearTimeout(timer);
  }, [text, term, startLoading]);

  useEffect(() => {
    const current = parseSearch(term);
    if (!current) return;
    let active = true;
    api.lots(tab, page, current).then(
      (data) => {
        if (!active) return;
        // busca nova abre a primeira aba com resultado; depois disso a aba é do visitante
        const picked = picking.current ? searchTab(data.counts, tab) : tab;
        picking.current = false;
        if (picked !== tab) setTab(picked);
        // a última página pode esvaziar quando lotes mudam de aba com o tempo
        else if (data.items.length === 0 && page > 1) setPage(page - 1);
        else setShowcase({ status: 'ready', data });
      },
      () =>
        active && setShowcase((previous) => ({ ...previous, status: 'error' })),
    );
    return () => {
      active = false;
    };
  }, [tab, page, term, attempt]);

  const choose = useCallback(
    (next: LotStatus) => {
      startLoading();
      picking.current = false;
      setTab(next);
      setPage(1);
      setAttempt((current) => current + 1);
    },
    [startLoading],
  );

  const turn = useCallback(
    (next: number) => {
      startLoading();
      setPage(next);
      setAttempt((current) => current + 1);
    },
    [startLoading],
  );

  const retry = useCallback(() => {
    startLoading();
    setAttempt((current) => current + 1);
  }, [startLoading]);

  const clear = useCallback(() => {
    startLoading();
    picking.current = false;
    setText('');
    setTerm('');
    setTab('live');
    setPage(1);
    setAttempt((current) => current + 1);
  }, [startLoading]);

  return {
    showcase,
    tab,
    page,
    text,
    searching: term !== '',
    impossible: filter === null,
    type: setText,
    choose,
    turn,
    retry,
    clear,
  };
}
