import { useRef } from 'react';
import type { LoginRequest } from '../../shared/api/types';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './demo-accounts';

type Props = { onPick: (values: LoginRequest) => void };

export function DemoAccountsBox({ onPick }: Props) {
  const box = useRef<HTMLDetailsElement>(null);

  function pick(email: string) {
    if (box.current) box.current.open = false;
    onPick({ email, password: DEMO_PASSWORD });
  }

  return (
    <details ref={box} className="demo-box">
      <summary className="demo-box-summary">
        <span>Testar com uma conta de demonstração</span>
        <ArrowIcon />
      </summary>
      <div className="demo-box-panel">
        <ul className="demo-box-list">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                className="demo-box-account"
                onClick={() => pick(account.email)}
              >
                <span className="demo-box-line">
                  <span className="demo-box-name">{account.name}</span>
                  <span className="demo-box-role">{account.role}</span>
                </span>
                <span className="demo-box-email">{account.email}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="demo-box-password">Senha de todas: {DEMO_PASSWORD}</p>
      </div>
    </details>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="demo-box-arrow"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="M3.5 6 8 10.5 12.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="square"
      />
    </svg>
  );
}
