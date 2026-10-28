import { useEffect } from 'react';
import { useLocation } from 'react-router';

// o roteador não rola até a âncora; a key muda também no clique repetido no mesmo link
// âncora malformada (ex.: "#%E0") não pode derrubar a página
function targetOf(hash: string): string {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

export function useHashScroll(settled: boolean) {
  const { hash, key } = useLocation();

  useEffect(() => {
    if (hash.length < 2) return;
    document.getElementById(targetOf(hash))?.scrollIntoView();
  }, [hash, key, settled]);
}
