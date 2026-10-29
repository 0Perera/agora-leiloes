import { Link, NavLink } from 'react-router';
import { WalletBadge } from '../features/wallet/wallet-badge';
import { AccountMenu } from './account-menu';
import { Logo } from './logo';
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
          <Logo className="header-logo" />
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
            <NavLink className="nav-link" to="/dashboard">
              Painel do leiloeiro
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
