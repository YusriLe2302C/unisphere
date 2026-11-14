import { Outlet } from 'react-router-dom';
import { Brand } from '../components/ui/Brand';
import { API_BASE_URL } from '../services/api';

const apiDocsUrl = `${API_BASE_URL.replace(/\/api$/, '')}/api/docs`;

export function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="public-header wrap">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#platform">Platform</a>
          <a href={apiDocsUrl} target="_blank" rel="noreferrer">
            API docs
          </a>
          <a className="button button-secondary" href="/login">
            Sign in
          </a>
        </nav>
      </header>
      <Outlet />
      <footer className="public-footer wrap">
        <span>© {new Date().getFullYear()} UniSphere</span>
        <a href="/design-system">Design system preview</a>
      </footer>
    </div>
  );
}
