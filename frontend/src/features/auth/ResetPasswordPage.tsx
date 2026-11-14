import { useState, type FormEvent } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../services/api';
import { authApi } from '../../services/auth/auth-api';
import { AuthCard, AuthPageFrame } from './AuthPageFrame';

export function ResetPasswordPage() {
  const params = useParams();
  const [search] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(
    params.token ??
      search.get('token') ??
      (location.state as { resetToken?: string } | null)?.resetToken ??
      '',
  );
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!token.trim()) {
      setError('Enter the password reset token from your reset link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await authApi.resetPassword(token.trim(), password);
      setDone(true);
      navigate('/login', { replace: true, state: { message: response.message } });
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'Unable to reset the password. Check your connection and try again.',
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
        <div className="eyebrow">ACCOUNT RECOVERY</div>
        <h1>Choose a new password</h1>
        <p className="auth-subtitle">Use the token from your password reset link.</p>
        {done ? (
          <p className="auth-form-success" role="status">
            Password updated. Redirecting to sign in…
          </p>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="reset-token">Reset token</label>
            <input
              id="reset-token"
              className="auth-control"
              autoComplete="one-time-code"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
            <label htmlFor="new-password">New password</label>
            <div className="input-wrap">
              <LockKeyhole size={17} />
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              className="auth-control"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
            {error && (
              <p className="auth-form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button button-primary auth-submit" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
              {!submitting && <ArrowRight size={17} />}
            </button>
          </form>
        )}
        <div className="auth-footer">
          <Link to="/login">Return to sign in</Link>
        </div>
      </AuthCard>
    </AuthPageFrame>
  );
}
