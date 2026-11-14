import { apiRequest } from '../api';
import type {
  AuthResponse,
  AuthUser,
  ForgotPasswordResponse,
  MessageResponse,
  RegisterInput,
} from '../../types/auth';

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<AuthResponse>('auth/login', {
      method: 'POST',
      body: input,
      clearSessionOnUnauthorized: false,
    }),
  me: (token: string) => apiRequest<{ user: AuthUser }>('auth/me', { token }),
  register: (input: RegisterInput) =>
    apiRequest<AuthResponse>('auth/register', {
      method: 'POST',
      body: input,
      clearSessionOnUnauthorized: false,
    }),
  forgotPassword: (email: string) =>
    apiRequest<ForgotPasswordResponse>('auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  resetPassword: (token: string, newPassword: string) =>
    apiRequest<MessageResponse>('auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    }),
  verifyEmail: (token: string) =>
    apiRequest<MessageResponse>(`auth/verify-email/${encodeURIComponent(token)}`),
  logout: (token: string) =>
    apiRequest<{ message: string }>('auth/logout', { method: 'POST', token }),
};
