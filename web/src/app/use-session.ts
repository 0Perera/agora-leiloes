import { createContext, useContext } from 'react';
import type { AuthResponse } from '../shared/api/types';
import type { Session } from './session';

export type SessionValue = {
  session: Session | null;
  signIn: (auth: AuthResponse) => void;
  signOut: () => void;
};

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}
