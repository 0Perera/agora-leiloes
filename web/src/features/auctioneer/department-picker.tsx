import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { CatalogDepartment } from '../../shared/api/types';
import { departments } from './departments';

type Props = {
  value: CatalogDepartment;
  onChange: (value: CatalogDepartment) => void;
};

const last = departments.length - 1;

function indexOf(value: CatalogDepartment): number {
  return departments.findIndex((item) => item.value === value);
}

function moved(key: string, current: number): number | null {
  if (key === 'ArrowDown') return Math.min(current + 1, last);
  if (key === 'ArrowUp') return Math.max(current - 1, 0);
  if (key === 'Home') return 0;
  if (key === 'End') return last;
  return null;
}

// lista suspensa própria: a do <select> nativo não aceita o visual da casa
export function DepartmentPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(indexOf(value));
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  function show() {
    setActive(indexOf(value));
    setOpen(true);
  }

  function choose(index: number) {
    onChange(departments[index].value);
    setOpen(false);
    button.current?.focus();
  }

  function keyClosed(event: KeyboardEvent) {
    if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    show();
  }

  function keyOpen(event: KeyboardEvent) {
    const next = moved(event.key, active);
    if (next !== null) {
      event.preventDefault();
      setActive(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  }

  const current = departments[indexOf(value)];

  return (
    <div ref={root} className="ag-field panel-search-department">
      <span id="dept-label" className="ag-field__label">
        Departamento
      </span>
      <div className="panel-picker">
        <button
          ref={button}
          id="dept"
          className="ag-input panel-picker-button"
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls="dept-list"
          aria-labelledby="dept-label dept"
          aria-activedescendant={open ? `dept-${active}` : undefined}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={open ? keyOpen : keyClosed}
        >
          <span className="panel-picker-value">{current.label}</span>
          <span className="panel-picker-caret" aria-hidden="true">
            ▾
          </span>
        </button>
        {open && (
          <ul
            id="dept-list"
            className="panel-picker-list"
            role="listbox"
            aria-labelledby="dept-label"
          >
            {departments.map((item, index) => (
              <li
                key={item.value}
                id={`dept-${index}`}
                className={
                  index === active
                    ? 'panel-picker-option is-active'
                    : 'panel-picker-option'
                }
                role="option"
                aria-selected={item.value === value}
                onPointerEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                {item.value === value && (
                  <span className="panel-picker-check" aria-hidden="true">
                    ✓
                  </span>
                )}
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
