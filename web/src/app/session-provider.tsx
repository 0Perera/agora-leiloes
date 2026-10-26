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
  const [expired, setExpired] = useState(false);

  const signIn = useCallback((auth: AuthResponse) => {
    saveSession(auth);
    setToken(auth.token);
    setSession(auth);
    setExpired(false);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setToken(null);
    setSession(null);
    setExpired(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut();
      setExpired(true);
      onExpire();
    });
  }, [signOut, onExpire]);

  const value = useMemo(
    () => ({ session, expired, signIn, signOut }),
    [session, expired, signIn, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
