import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { setToken, setUnauthorizedHandler } from '../shared/api/client';
import type { AuthResponse } from '../shared/api/types';
import { clearSession, loadSession, saveSession } from './session';
import type { Session } from './session';
import { SessionContext } from './use-session';

type Props = {
  children: ReactNode;
  onExpire: () => void;
};

function initialSession(): Session | null {
  const session = loadSession();
  setToken(session?.token ?? null);
  return session;
}

export function SessionProvider({ children, onExpire }: Props) {
  const [session, setSession] = useState(initialSession);

  const signIn = useCallback((auth: AuthResponse) => {
    saveSession(auth);
    setToken(auth.token);
    setSession(auth);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setToken(null);
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
      onExpire();
    });
  }, [signOut, onExpire]);

  const value = useMemo(
    () => ({ session, signIn, signOut }),
    [session, signIn, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
