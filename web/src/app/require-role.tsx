import { Navigate, Outlet } from 'react-router';
import type { Role } from '../shared/api/types';
import { useSession } from './use-session';

type Props = {
  role: Role;
};

export function RequireRole({ role }: Props) {
  const { session } = useSession();
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
