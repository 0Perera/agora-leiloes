import { useEffect, useId, useRef, useState } from 'react';
import { restoresFocus } from '../../app/menu-close';
import type { CloseReason } from '../../app/menu-close';
import type { CatalogDepartment } from '../../shared/api/types';
import { suggestions } from './departments';

type Props = {
  department: CatalogDepartment;
  onPick: (term: string) => void;
};

export function SearchSuggestions({ department, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (reason: CloseReason) => {
      setOpen(false);
      if (restoresFocus(reason)) trigger.current?.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close('escape');
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close('outside');
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  function pick(term: string) {
    setOpen(false);
    trigger.current?.focus();
    onPick(term);
  }

  return (
    <div className="panel-suggest" ref={root}>
      <button
        ref={trigger}
        className="panel-suggest-trigger"
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Sugestões de busca"
        title="Sugestões de busca"
        onClick={() => setOpen((current) => !current)}
      >
        <BulbIcon />
      </button>
      <div id={listId} className="panel-suggest-panel" hidden={!open}>
        <p className="panel-suggest-title">Experimente</p>
        <ul className="panel-suggest-list">
          {suggestions[department].map((term) => (
            <li key={term}>
              <button
                className="panel-suggest-term"
                type="button"
                onClick={() => pick(term)}
              >
                {term}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BulbIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
    </svg>
  );
}
