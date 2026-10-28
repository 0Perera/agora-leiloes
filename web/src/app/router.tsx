import { createBrowserRouter } from 'react-router';
import { AuditPage } from '../features/audit/audit-page';
import { DashboardPage } from '../features/auctioneer/dashboard-page';
import { LoginPage } from '../features/auth/login-page';
import { SignupPage } from '../features/auth/signup-page';
import { RoomPage } from '../features/live-room/room-page';
import { HomePage } from '../features/lots/home-page';
import { MyBidsPage } from '../features/my-bids/my-bids-page';
import { ReceiptPage } from '../features/receipts/receipt-page';
import { WalletPage } from '../features/wallet/wallet-page';
import { GuestOnly } from './guest-only';
import { Layout } from './layout';
import { RequireRole } from './require-role';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/lots/:id', element: <RoomPage /> },
      { path: '/lots/:id/audit', element: <AuditPage /> },
      { path: '/receipts/:token', element: <ReceiptPage /> },
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
        ],
      },
      {
        element: <RequireRole role="AUCTIONEER" />,
        children: [{ path: '/dashboard', element: <DashboardPage /> }],
      },
      {
        element: <RequireRole role="BIDDER" />,
        children: [
          { path: '/wallet', element: <WalletPage /> },
          { path: '/my-bids', element: <MyBidsPage /> },
        ],
      },
    ],
  },
]);
