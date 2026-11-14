import { useState, type FormEvent } from 'react';
import { ArrowRight, MailCheck } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../services/api';
import { authApi } from '../../services/auth/auth-api';
import { AuthCard, AuthPageFrame } from './AuthPageFrame';

export function VerifyEmailPage() {
  const params = useParams();
  const [search] = useSearchParams();
  const [token, setToken] = useState(params.token ?? search.get('token') ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const response = await authApi.verifyEmail(token.trim());
      setMessage(response.message);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'Unable to verify this email. Check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <AuthPageFrame>
      <AuthCard>
        <span className="auth-symbol">
          <MailCheck size={20} />
        </span>
        <div className="eyebrow">EMAIL VERIFICATION</div>
        <h1>Verify your email</h1>
        <p className="auth-subtitle">
          Enter the verification token supplied in your institution’s verification link.
        </p>
        {message && (
          <p className="auth-form-success" role="status">
            {message}
          </p>
        )}
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="verify-token">Verification token</label>
          <input
            id="verify-token"
            className="auth-control"
            autoComplete="one-time-code"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />
          {error && (
            <p className="auth-form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button button-primary auth-submit" disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify email'}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>
        <div className="auth-footer">
          <Link to="/login">Return to sign in</Link>
        </div>
      </AuthCard>
    </AuthPageFrame>
  );
}
