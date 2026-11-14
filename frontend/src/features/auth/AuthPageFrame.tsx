import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../../components/ui/Brand';

export function AuthPageFrame({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-backdrop" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="auth-top">
        <Brand />
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to home
        </Link>
      </div>
      {children}
      <div className="auth-bottom">A shared space for everything you’re becoming.</div>
    </main>
  );
}

export function AuthCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`auth-card ${className}`}>{children}</section>;
}
