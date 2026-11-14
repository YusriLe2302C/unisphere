import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Brand } from '../ui/Brand';
import type { AppNavigationSection } from '../../layouts/navigation-config';

export function NavigationLinks({
  sections,
  collapsed = false,
  onNavigate,
}: {
  sections: AppNavigationSection[];
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="app-navigation" aria-label="Workspace navigation">
      {sections.map((section) => (
        <section className="app-navigation-section" key={section.label}>
          <h2 className="app-navigation-label">{section.label}</h2>
          <div className="app-navigation-items">
            {section.items.map(({ path, label, icon: Icon, end }) => (
              <NavLink
                key={`${section.label}-${path}`}
                to={path}
                end={end}
                aria-label={label}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  ['app-navigation-link', isActive && 'is-active'].filter(Boolean).join(' ')
                }
                onClick={onNavigate}
              >
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function AppSidebar({
  sections,
  collapsed,
  onToggleCollapse,
}: {
  sections: AppNavigationSection[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <aside
      id="workspace-sidebar"
      className={['app-sidebar', collapsed && 'is-collapsed'].filter(Boolean).join(' ')}
    >
      <div className="app-sidebar-brand">
        <Brand compact={collapsed} />
        {!collapsed && <span className="app-sidebar-caption">CAMPUS WORKSPACE</span>}
      </div>
      <NavigationLinks sections={sections} collapsed={collapsed} />
      <button
        className="app-sidebar-collapse"
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        {!collapsed && <span>Collapse sidebar</span>}
      </button>
    </aside>
  );
}
