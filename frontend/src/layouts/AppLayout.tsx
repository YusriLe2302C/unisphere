import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from '../components/navigation/AppHeader';
import { AppSidebar, NavigationLinks } from '../components/navigation/AppSidebar';
import { useAuth } from '../app/providers/useAuth';
import { Breadcrumbs, Drawer } from '../components/ui';
import { getCurrentNavigationItem, getNavigationForRole } from './navigation-config';
import type { UserRole } from '../types/auth';
import './app-shell.css';

const fallbackTitles: Record<string, string> = {
  alumni: 'Alumni network',
  calendar: 'Calendar',
  community: 'Communities',
  conversations: 'Conversations',
  mentorship: 'Mentorship',
  opportunities: 'Opportunities',
  reports: 'Reports',
  settings: 'Settings',
  submissions: 'Student Submissions',
  users: 'Users',
};

function getPageTitle(pathname: string, role: UserRole | undefined): string {
  if (pathname === '/app/research') return 'Research and Development';
  if (pathname === '/app/research/collaborations/requests') return 'My collaboration requests';
  if (pathname.startsWith('/app/research/papers/')) return 'Research details';
  if (pathname.startsWith('/app/research/collaborations/')) return 'Collaboration details';
  if (pathname === '/app/career-connect') return 'Career Connect';
  if (pathname.startsWith('/app/career-connect/alumni')) return 'Alumni directory';
  if (pathname.startsWith('/app/career-connect/questions')) return 'Career questions';
  if (pathname.startsWith('/app/career-connect/connections')) return 'Connections';
  if (pathname.startsWith('/app/conversations')) return 'Conversations';
  if (pathname.startsWith('/app/mentorship')) return 'Mentorship';
  if (pathname === '/app/placements/applications') return 'My placement applications';
  if (pathname.startsWith('/app/placements/applications/')) return 'Application details';
  if (pathname === '/app/placements/opportunities') return 'Placement opportunities';
  if (pathname.startsWith('/app/placements/opportunities/')) return 'Placement drive details';
  if (pathname === '/app/placements') return 'Student placements';
  if (pathname === '/app/events/mine') return 'My registered events';
  if (pathname.startsWith('/app/events/')) return 'Event details';
  const configuredItem = getCurrentNavigationItem(pathname, role);
  if (configuredItem) return configuredItem.label;
  const segment = pathname.split('/').filter(Boolean).at(-1) ?? 'app';
  if (segment === 'app') return 'Dashboard';
  return (
    fallbackTitles[segment] ??
    segment.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const sections = getNavigationForRole(user?.role);
  const pageTitle = getPageTitle(location.pathname, user?.role);

  return (
    <div
      className={['unisphere-app', sidebarCollapsed && 'sidebar-is-collapsed']
        .filter(Boolean)
        .join(' ')}
    >
      <AppHeader
        onOpenMobileNavigation={() => setMobileNavigationOpen(true)}
        mobileNavigationOpen={mobileNavigationOpen}
        onToggleDesktopSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
        sidebarCollapsed={sidebarCollapsed}
      />
      <AppSidebar
        sections={sections}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <div className="app-main-content">
        <div className="app-context-bar">
          <Breadcrumbs items={[{ label: 'Workspace', href: '/app' }, { label: pageTitle }]} />
          {user?.department && <span className="app-context-department">{user.department}</span>}
        </div>
        <main className="app-page-content">
          <Outlet />
        </main>
      </div>
      <Drawer
        open={mobileNavigationOpen}
        onClose={() => setMobileNavigationOpen(false)}
        title="Workspace navigation"
        description={user?.institution}
      >
        <div id="workspace-mobile-navigation" className="app-mobile-navigation">
          <NavigationLinks sections={sections} onNavigate={() => setMobileNavigationOpen(false)} />
        </div>
      </Drawer>
    </div>
  );
}
