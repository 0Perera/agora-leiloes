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
        <button
          className="ag-btn ag-btn--secondary account-leave"
          type="button"
          onClick={leave}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
