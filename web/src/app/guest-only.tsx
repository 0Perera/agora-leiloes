import { Navigate, Outlet } from 'react-router';
import { homePath } from './session';
import { useSession } from './use-session';

export function GuestOnly() {
  const { session } = useSession();
  if (session) return <Navigate to={homePath(session.user.role)} replace />;
  return <Outlet />;
}
