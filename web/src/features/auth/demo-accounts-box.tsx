import type { LoginRequest } from '../../shared/api/types';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './demo-accounts';

type Props = { onPick: (values: LoginRequest) => void };

export function DemoAccountsBox({ onPick }: Props) {
  return (
    <section className="demo-accounts" aria-labelledby="demo-accounts-title">
      <h2 id="demo-accounts-title" className="demo-accounts-title">
        Contas de demonstração
      </h2>
      <div className="demo-accounts-list">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            className="ag-btn ag-btn--secondary demo-account"
            onClick={() =>
              onPick({ email: account.email, password: DEMO_PASSWORD })
            }
          >
            <span>{account.name}</span>
            <span className="demo-account-role">{account.role}</span>
          </button>
        ))}
      </div>
      <p className="demo-accounts-password">Senha de todas: {DEMO_PASSWORD}</p>
    </section>
  );
}
