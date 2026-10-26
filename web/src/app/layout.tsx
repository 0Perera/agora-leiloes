import { Outlet } from 'react-router';
import { Header } from './header';
import './layout.css';

export function Layout() {
  return (
    <div className="ag-ground layout">
      <Header />
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
