import { useEffect } from 'react';
import { useLocation } from 'react-router';

// o roteador não rola até a âncora; a key muda também no clique repetido no mesmo link
export function useHashScroll(settled: boolean) {
  const { hash, key } = useLocation();

  useEffect(() => {
    if (hash.length < 2) return;
    document
      .getElementById(decodeURIComponent(hash.slice(1)))
      ?.scrollIntoView();
  }, [hash, key, settled]);
}
