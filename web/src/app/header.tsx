import { Link, NavLink } from 'react-router';
import { WalletBadge } from '../features/wallet/wallet-badge';
import { AccountMenu } from './account-menu';
import type { Session } from './session';
import { useSession } from './use-session';

export function Header() {
  const { session } = useSession();
  const isAuctioneer = session?.user.role === 'AUCTIONEER';
  const isBidder = session?.user.role === 'BIDDER';

  return (
    <header className="header">
      <div className="header-bar">
        <Link
          className="header-brand"
          to="/"
          aria-label="Ágora, página inicial"
        >
          <Logo />
          <span className="header-name">ÁGORA</span>
        </Link>
        <nav className="header-nav" aria-label="Principal">
          <NavLink className="nav-link" to="/" end>
            Vitrine
          </NavLink>
          <Link className="nav-link" to="/#como-funciona">
            Como funciona
          </Link>
          <Link className="nav-link" to="/#auditoria">
            Auditoria
          </Link>
          {isAuctioneer && (
            <NavLink
              className="nav-link"
              to="/dashboard"
              aria-label="Painel do leiloeiro"
            >
              <span className="nav-link__full">Painel do leiloeiro</span>
              <span className="nav-link__short">Painel</span>
            </NavLink>
          )}
          {isBidder && (
            <NavLink className="nav-link" to="/my-bids">
              Meus lances
            </NavLink>
          )}
        </nav>
        <div
          className={
            session ? 'header-actions' : 'header-actions header-actions--guest'
          }
        >
          {session ? <Account session={session} /> : <GuestActions />}
        </div>
      </div>
      <div className="ag-meander header-meander" />
    </header>
  );
}

function GuestActions() {
  return (
    <>
      <Link className="ag-btn ag-btn--secondary header-btn" to="/login">
        Entrar
      </Link>
      <Link className="ag-btn ag-btn--primary header-btn" to="/signup">
        Criar conta
      </Link>
    </>
  );
}

function Account({ session }: { session: Session }) {
  return (
    <>
      {session.user.role === 'BIDDER' && <WalletBadge />}
      <AccountMenu session={session} />
    </>
  );
}

function Logo() {
  return (
    <svg
      className="header-logo"
      width="34"
      height="34"
      viewBox="0 0 34 34"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="32" height="48" rx="16" ry="16" fill="#1f4b96" />
      <rect x="5" y="5" width="24" height="48" rx="12" ry="12" fill="#f2ede3" />
      <rect x="8" y="8" width="18" height="48" rx="9" ry="9" fill="#9a7529" />
      <rect x="12" y="12" width="10" height="48" rx="5" ry="5" fill="#b23a1f" />
    </svg>
  );
}
