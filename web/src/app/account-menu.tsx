import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { Session } from './session';
import { initialsOf } from './initials';
import { useSession } from './use-session';

export function AccountMenu({ session }: { session: Session }) {
  const { signOut } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const { name, role } = session.user;
  const roleLabel = role === 'BIDDER' ? 'Licitante' : 'Leiloeiro';

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      trigger.current?.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  function leave() {
    signOut();
    void navigate('/login', { replace: true });
  }

  return (
    <div className="account" ref={root}>
      <button
        ref={trigger}
        className="account-monogram"
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Conta de ${name}`}
        onClick={() => setOpen((current) => !current)}
      >
        {initialsOf(name)}
      </button>
      <div id={panelId} className="account-panel" hidden={!open}>
        <p className="account-name">{name}</p>
        <p className="account-role">{roleLabel}</p>
        <div className="ag-rule account-rule" />
        <button className="account-leave" type="button" onClick={leave}>
          <LeaveIcon />
          Sair
        </button>
      </div>
    </div>
  );
}

function LeaveIcon() {
  return (
    <svg
      className="account-leave__icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="M6 2.5H3v11h3M10.5 5 13.5 8l-3 3M13.5 8H6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
  );
}
