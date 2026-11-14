import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import { getNavigationForRole } from '../../layouts/navigation-config';
import { AuthCard, AuthPageFrame } from './AuthPageFrame';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { signIn, isAuthenticated, isInitializing, sessionExpired, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: { pathname?: string }; message?: string } | null;
  const dashboard =
    getNavigationForRole(user?.role)
      .flatMap((section) => section.items)
      .find((item) => item.end)?.path ?? '/app';
  const destination = state?.from?.pathname ?? dashboard;

  if (isInitializing)
    return (
      <AuthPageFrame>
        <div className="auth-card" aria-live="polite">
          Checking your session…
        </div>
      </AuthPageFrame>
    );
  if (isAuthenticated) return <Navigate to={destination} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSubmitting(true);
    try {
      const authenticatedUser = await signIn(email.trim(), password);
      const roleDashboard =
        getNavigationForRole(authenticatedUser.role)
          .flatMap((section) => section.items)
          .find((item) => item.end)?.path ?? '/app';
      navigate(state?.from?.pathname ?? roleDashboard, { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to sign in. Check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageFrame>
      <AuthCard>
        <span className="auth-symbol">
          <LockKeyhole size={20} />
        </span>
        <div className="eyebrow">WELCOME BACK</div>
        <h1>
          Your campus, <br />
          right where you left it.
        </h1>
        <p className="auth-subtitle">Sign in to continue to your UniSphere workspace.</p>
        {sessionExpired && (
          <p className="auth-form-notice" role="status">
            Your session expired. Sign in again to continue.
          </p>
        )}
        {state?.message && (
          <p className="auth-form-success" role="status">
            {state.message}
          </p>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Email address</label>
          <div className="input-wrap">
            <Mail size={17} aria-hidden="true" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@rnsit.ac.in"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="auth-label-row">
            <label htmlFor="password">Password</label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <div className="input-wrap">
            <LockKeyhole size={17} aria-hidden="true" />
            <input
              id="password"
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              aria-describedby={errorMessage ? 'login-error' : undefined}
            />
            <button
              type="button"
              className="field-action"
              aria-label={visible ? 'Hide password' : 'Show password'}
              onClick={() => setVisible((value) => !value)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errorMessage && (
            <p id="login-error" className="auth-form-error" role="alert">
              {errorMessage}
            </p>
          )}
          <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>
        <div className="auth-footer">
          New to UniSphere? <Link to="/register">Create an account</Link>
        </div>
      </AuthCard>
    </AuthPageFrame>
  );
}
