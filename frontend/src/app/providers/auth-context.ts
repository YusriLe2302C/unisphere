import { createContext } from 'react';
import type { AuthSession, AuthUser, RegisterInput } from '../../types/auth';

export interface AuthContextValue {
  session: AuthSession | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  sessionExpired: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  updateUser: (updates: Partial<AuthUser>) => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
