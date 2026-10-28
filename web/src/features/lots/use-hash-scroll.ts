import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

export type ScrollGate = { settled: boolean; done: boolean; manual: boolean };

// âncora malformada (ex.: "#%E0") não pode derrubar a página
function targetOf(hash: string): string {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

// uma rolagem só por navegação, depois do conteúdo de cima carregar, e nunca contra a do usuário
export function scrollTarget(hash: string, gate: ScrollGate): string | null {
  if (hash.length < 2 || !gate.settled || gate.done || gate.manual) return null;
  return targetOf(hash);
}

const manualEvents = ['wheel', 'touchmove', 'keydown'] as const;

export function useHashScroll(settled: boolean) {
  const { hash, key } = useLocation();
  const gate = useRef({ key: '', done: false, manual: false });

  useEffect(() => {
    gate.current = { key, done: false, manual: false };
    const stop = () => {
      gate.current.manual = true;
    };
    manualEvents.forEach((name) =>
      window.addEventListener(name, stop, { passive: true }),
    );
    return () =>
      manualEvents.forEach((name) => window.removeEventListener(name, stop));
  }, [key]);

  useEffect(() => {
    const target = scrollTarget(hash, { settled, ...gate.current });
    const element = target ? document.getElementById(target) : null;
    if (!element) return;
    gate.current.done = true;
    element.scrollIntoView();
  }, [hash, key, settled]);
}
