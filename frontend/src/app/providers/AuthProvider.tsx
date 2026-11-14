import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../../services/auth/auth-api';
import { setUnauthorizedHandler } from '../../services/api';
import { clearSession, readSession, writeSession } from '../../utils/storage';
import type { AuthSession, AuthUser, RegisterInput } from '../../types/auth';
import { ApiError } from '../../services/api';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const initialSession = useRef(session);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const endSession = useCallback((expired = false) => {
    clearSession();
    setSession(null);
    setSessionExpired(expired);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => endSession(true));
    return () => setUnauthorizedHandler(undefined);
  }, [endSession]);

  useEffect(() => {
    let active = true;
    if (!initialSession.current) {
      setIsInitializing(false);
      return () => {
        active = false;
      };
    }
    authApi
      .me(initialSession.current.token)
      .then(({ user }) => {
        if (active) {
          const refreshed = { token: initialSession.current!.token, user };
          writeSession(refreshed);
          setSession(refreshed);
        }
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof ApiError && error.status === 401)) return;
        endSession();
      })
      .finally(() => {
        if (active) setIsInitializing(false);
      });
    return () => {
      active = false;
    };
  }, [endSession]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const response = await authApi.login({ email, password });
    const nextSession = { token: response.token, user: response.user };
    writeSession(nextSession);
    setSession(nextSession);
    setSessionExpired(false);
    return response.user;
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<AuthUser> => {
    const response = await authApi.register(input);
    const nextSession = { token: response.token, user: response.user };
    writeSession(nextSession);
    setSession(nextSession);
    setSessionExpired(false);
    return response.user;
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    setSession((current) => {
      if (!current) return current;
      const nextSession = { ...current, user: { ...current.user, ...updates } };
      writeSession(nextSession);
      return nextSession;
    });
  }, []);

  const signOut = useCallback(async () => {
    const token = session?.token;
    endSession();
    if (token) await authApi.logout(token).catch(() => undefined);
  }, [endSession, session?.token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      isInitializing,
      sessionExpired,
      signIn,
      register,
      updateUser,
      signOut,
    }),
    [session, isInitializing, sessionExpired, signIn, register, updateUser, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
