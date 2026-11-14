import { useState, type FormEvent } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../services/api';
import { authApi } from '../../services/auth/auth-api';
import { AuthCard, AuthPageFrame } from './AuthPageFrame';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const response = await authApi.forgotPassword(email.trim());
      setMessage(response.message);
      setResetToken(response.resetToken ?? '');
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'Unable to submit the request. Check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <AuthPageFrame>
      <AuthCard>
        <span className="auth-symbol">
          <Mail size={20} />
        </span>
        <div className="eyebrow">ACCOUNT RECOVERY</div>
        <h1>Reset your password</h1>
        <p className="auth-subtitle">Enter the email address associated with your account.</p>
        {message ? (
          <div className="auth-success-panel" role="status">
            <p>{message}</p>
            {resetToken && (
              <button
                className="button button-primary"
                type="button"
                onClick={() => navigate('/reset-password', { state: { resetToken } })}
              >
                Continue to reset password <ArrowRight size={16} />
              </button>
            )}
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="forgot-email">Email address</label>
            <div className="input-wrap">
              <Mail size={17} />
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            {error && (
              <p className="auth-form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button button-primary auth-submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Continue'}
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
