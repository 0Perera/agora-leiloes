import { useCallback, useEffect, useState } from 'react';
import { api } from '../../shared/api/client';
import type { MyBids, MyBidsSection } from '../../shared/api/types';
import type { Load } from '../../shared/lib/load';

export function useMyBids() {
  const [state, setState] = useState<Load<MyBids>>({
    status: 'loading',
    data: null,
  });
  const [section, setSection] = useState<MyBidsSection>('ongoing');
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api.myBids(section, page).then(
      (data) => {
        if (!active) return;
        // um lote pode mudar de aba entre duas páginas e esvaziar a última
        if (data.items.length === 0 && page > 1) setPage(page - 1);
        else setState({ status: 'ready', data });
      },
      () => active && setState((current) => ({ ...current, status: 'error' })),
    );
    return () => {
      active = false;
    };
  }, [section, page, attempt]);

  const load = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }));
    setAttempt((current) => current + 1);
  }, []);

  const choose = useCallback(
    (next: MyBidsSection) => {
      setSection(next);
      setPage(1);
      load();
    },
    [load],
  );

  const turn = useCallback(
    (next: number) => {
      setPage(next);
      load();
    },
    [load],
  );

  return { state, section, retry: load, choose, turn };
}
