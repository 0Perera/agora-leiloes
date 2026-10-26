import { createBrowserRouter } from 'react-router';
import { DashboardPage } from '../features/auctioneer/dashboard-page';
import { LoginPage } from '../features/auth/login-page';
import { SignupPage } from '../features/auth/signup-page';
import { HomePage } from '../features/lots/home-page';
import { GuestOnly } from './guest-only';
import { Layout } from './layout';
import { RequireRole } from './require-role';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
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
    ],
  },
]);
