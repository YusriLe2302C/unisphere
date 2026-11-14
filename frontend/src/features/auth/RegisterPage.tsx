import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import { getNavigationForRole } from '../../layouts/navigation-config';
import type { RegisterInput } from '../../types/auth';
import { AuthCard, AuthPageFrame } from './AuthPageFrame';

export function RegisterPage() {
  const { register, isAuthenticated, isInitializing, user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'student',
    institution: '',
    department: '',
    degree: '',
    graduationYear: '',
    semester: '',
    batch: '',
    collegeId: '',
    headline: '',
    bio: '',
  });
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  if (isInitializing)
    return (
      <AuthPageFrame>
        <div className="auth-card">Checking your session…</div>
      </AuthPageFrame>
    );
  if (isAuthenticated && !successMessage) {
    const dashboard =
      getNavigationForRole(user?.role)
        .flatMap((section) => section.items)
        .find((item) => item.end)?.path ?? '/app';
    return <Navigate to={dashboard} replace />;
  }
  const update =
    (key: keyof typeof values) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    if (values.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (values.password !== values.confirm) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const input: RegisterInput = {
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      role: values.role as RegisterInput['role'],
      institution: values.institution.trim(),
      ...(values.department.trim() && { department: values.department.trim() }),
      ...(values.graduationYear && { graduationYear: Number(values.graduationYear) }),
      ...(values.headline.trim() && { headline: values.headline.trim() }),
      ...(values.bio.trim() && { bio: values.bio.trim() }),
      ...(values.collegeId.trim() && { collegeId: values.collegeId.trim() }),
      ...(values.batch.trim() && { batch: values.batch.trim() }),
      ...(values.semester && { semester: Number(values.semester) }),
      ...(values.degree && { degree: values.degree as RegisterInput['degree'] }),
    };
    try {
      const account = await register(input);
      if (account.isVerified) {
        const dashboard =
          getNavigationForRole(account.role)
            .flatMap((section) => section.items)
            .find((item) => item.end)?.path ?? '/app';
        navigate(dashboard, { replace: true });
      } else
        setSuccessMessage(
          'Your account was created. Email verification is still pending. Use a verification link provided by your institution to verify your email.',
        );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to create your account. Check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <AuthPageFrame>
      <AuthCard className="auth-card-wide">
        <span className="auth-symbol">
          <UserRound size={20} />
        </span>
        <div className="eyebrow">JOIN UNISPHERE</div>
        <h1>Create your account</h1>
        <p className="auth-subtitle">Register with your institutional details.</p>
        {successMessage ? (
          <div className="auth-success-panel" role="status">
            <p>{successMessage}</p>
            <Link className="button button-primary" to="/verify-email">
              Verify email <ArrowRight size={16} />
            </Link>
            <p>
              <Link to="/app">Continue to UniSphere</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-register-grid">
              <div className="auth-field">
                <label htmlFor="reg-name">Full name</label>
                <div className="input-wrap">
                  <UserRound size={17} />
                  <input
                    id="reg-name"
                    autoComplete="name"
                    value={values.name}
                    onChange={update('name')}
                    required
                  />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="reg-email">Email address</label>
                <div className="input-wrap">
                  <Mail size={17} />
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={update('email')}
                    required
                  />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="reg-role">Account type</label>
                <select
                  id="reg-role"
                  className="auth-select"
                  value={values.role}
                  onChange={update('role')}
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="alumni">Alumni</option>
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="reg-institution">Institution</label>
                <input
                  id="reg-institution"
                  className="auth-control"
                  autoComplete="organization"
                  value={values.institution}
                  onChange={update('institution')}
                  required
                />
              </div>
              <div className="auth-field">
                <label htmlFor="reg-password">Password</label>
                <div className="input-wrap">
                  <LockKeyhole size={17} />
                  <input
                    id="reg-password"
                    type={visible ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={values.password}
                    onChange={update('password')}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="field-action"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    onClick={() => setVisible((current) => !current)}
                  >
                    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="reg-confirm">Confirm password</label>
                <input
                  id="reg-confirm"
                  className="auth-control"
                  type="password"
                  autoComplete="new-password"
                  value={values.confirm}
                  onChange={update('confirm')}
                  minLength={8}
                  required
                />
              </div>
            </div>
            <details className="auth-optional">
              <summary>Additional profile details (optional)</summary>
              <div className="auth-register-grid">
                <div className="auth-field">
                  <label htmlFor="reg-department">Department</label>
                  <input
                    id="reg-department"
                    className="auth-control"
                    value={values.department}
                    onChange={update('department')}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-degree">Degree</label>
                  <select
                    id="reg-degree"
                    className="auth-select"
                    value={values.degree}
                    onChange={update('degree')}
                  >
                    <option value="">Select degree</option>
                    {['btech', 'mtech', 'bca', 'mca', 'bsc', 'msc', 'phd', 'diploma'].map(
                      (degree) => (
                        <option key={degree} value={degree}>
                          {degree.toUpperCase()}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-year">Graduation year</label>
                  <input
                    id="reg-year"
                    className="auth-control"
                    type="number"
                    value={values.graduationYear}
                    onChange={update('graduationYear')}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-semester">Semester</label>
                  <input
                    id="reg-semester"
                    className="auth-control"
                    type="number"
                    min="1"
                    max="12"
                    value={values.semester}
                    onChange={update('semester')}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-batch">Batch</label>
                  <input
                    id="reg-batch"
                    className="auth-control"
                    value={values.batch}
                    onChange={update('batch')}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-college-id">College ID</label>
                  <input
                    id="reg-college-id"
                    className="auth-control"
                    value={values.collegeId}
                    onChange={update('collegeId')}
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="reg-headline">Headline</label>
                  <input
                    id="reg-headline"
                    className="auth-control"
                    value={values.headline}
                    onChange={update('headline')}
                  />
                </div>
                <div className="auth-field auth-field-full">
                  <label htmlFor="reg-bio">Bio</label>
                  <textarea
                    id="reg-bio"
                    className="auth-control auth-textarea"
                    value={values.bio}
                    onChange={update('bio')}
                  />
                </div>
              </div>
            </details>
            {errorMessage && (
              <p className="auth-form-error" role="alert">
                {errorMessage}
              </p>
            )}
            <button
              className="button button-primary auth-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Creating account…' : 'Create account'}
              {!submitting && <ArrowRight size={17} />}
            </button>
          </form>
        )}
        {!successMessage && (
          <div className="auth-footer">
            Already registered? <Link to="/login">Sign in</Link>
          </div>
        )}
      </AuthCard>
    </AuthPageFrame>
  );
}
