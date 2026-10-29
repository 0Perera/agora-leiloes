import { Outlet } from 'react-router';
import { WalletProvider } from '../features/wallet/wallet-provider';
import { Footer } from './footer';
import { Header } from './header';
import { useSession } from './use-session';
import './layout.css';

export function Layout() {
  const { session } = useSession();
  const content = (
    <div className="ag-ground layout">
      <Header />
      <main className="layout-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );

  if (session?.user.role !== 'BIDDER') return content;
  return <WalletProvider key={session.user.id}>{content}</WalletProvider>;
}
