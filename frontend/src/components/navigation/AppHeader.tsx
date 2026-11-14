import { useEffect, useState, type KeyboardEvent } from 'react';
import { Bell, ChevronDown, Menu, Search, Settings, SlidersHorizontal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/useAuth';
import { Avatar, Badge, DropdownItem, IconButton, SearchInput } from '../ui';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import collegeLogo from '../../assets/uni_logo.jpeg';
import { searchPeople, type SearchPerson } from '../../services/shared/shared-api';

function formatRole(role: string): string {
  return role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AppHeader({
  onOpenMobileNavigation,
  mobileNavigationOpen,
  onToggleDesktopSidebar,
  sidebarCollapsed,
}: {
  onOpenMobileNavigation: () => void;
  mobileNavigationOpen: boolean;
  onToggleDesktopSidebar: () => void;
  sidebarCollapsed: boolean;
}) {
  const { session, user, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<SearchPerson[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeResult, setActiveResult] = useState(-1);
  const navigate = useNavigate();
  const unreadCount = useUnreadNotifications(session?.token);
  useEffect(() => {
    const value = query.trim();
    setActiveResult(-1);
    if (value.length < 2 || !session?.token) {
      setPeople([]);
      setSearchError('');
      setSearchLoading(false);
      return;
    }
    let active = true;
    const timeout = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError('');
      void searchPeople(session.token, {
        q: value,
        institution: user?.institution,
        limit: 6,
        page: 1,
      })
        .then((result) => {
          if (active) setPeople(result.users);
        })
        .catch((error: unknown) => {
          if (active) {
            setPeople([]);
            setSearchError(error instanceof Error ? error.message : 'Search is unavailable.');
          }
        })
        .finally(() => {
          if (active) setSearchLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query, session?.token, user?.institution]);

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setQuery('');
      setPeople([]);
    }
    if (event.key === 'ArrowDown' && people.length) {
      event.preventDefault();
      setActiveResult((index) => (index + 1) % people.length);
    }
    if (event.key === 'ArrowUp' && people.length) {
      event.preventDefault();
      setActiveResult((index) => (index <= 0 ? people.length - 1 : index - 1));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeResult >= 0 && people[activeResult])
        navigate(`/app/people/${encodeURIComponent(people[activeResult]!._id)}`);
      else navigate(`/app/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/', { replace: true });
  }

  const countLabel = unreadCount !== null && unreadCount > 99 ? '99+' : unreadCount;

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-brand">
          <IconButton
            className="app-mobile-menu-button"
            label="Open navigation menu"
            aria-expanded={mobileNavigationOpen}
            aria-controls="workspace-mobile-navigation"
            onClick={onOpenMobileNavigation}
          >
            <Menu size={20} />
          </IconButton>
          <IconButton
            className="app-desktop-sidebar-button"
            label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
            aria-controls="workspace-sidebar"
            onClick={onToggleDesktopSidebar}
          >
            <SlidersHorizontal size={18} />
          </IconButton>
          <img className="app-college-logo" src={collegeLogo} alt="" />
          <div className="app-brand-copy">
            <strong>RNS Institute of Technology</strong>
            <span>UniSphere College Portal</span>
          </div>
        </div>

        <div className="app-header-search-wrap">
          <SearchInput
            aria-label="Search people in your institution"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => {
              setQuery('');
              setPeople([]);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search people, skills, departments"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={query.trim().length >= 2}
            aria-controls="global-search-results"
            aria-activedescendant={
              activeResult >= 0 ? `global-search-person-${activeResult}` : undefined
            }
          />
          {query.trim().length >= 2 && (
            <div
              className="app-search-results"
              id="global-search-results"
              role="listbox"
              aria-label="Search results"
            >
              {searchLoading ? (
                <p className="app-search-empty" role="status">
                  Searching…
                </p>
              ) : searchError ? (
                <p className="app-search-empty" role="alert">
                  {searchError}
                </p>
              ) : people.length ? (
                people.map((person, index) => (
                  <Link
                    className={`app-search-result${activeResult === index ? 'is-active' : ''}`}
                    id={`global-search-person-${index}`}
                    key={person._id}
                    role="option"
                    aria-selected={activeResult === index}
                    to={`/app/people/${encodeURIComponent(person._id)}`}
                    onClick={() => setQuery('')}
                  >
                    <Avatar src={person.avatar} name={person.name} size="xs" />
                    <span>
                      <strong>{person.name}</strong>
                      <small>
                        {person.headline || person.role.replaceAll('_', ' ')}
                        {person.department && person.privacySettings?.showAcademicDetails
                          ? ` · ${person.department}`
                          : ''}
                      </small>
                    </span>
                  </Link>
                ))
              ) : (
                <p className="app-search-empty">No matching people.</p>
              )}
              <Link
                className="app-search-all"
                to={`/app/search?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setQuery('')}
              >
                See all results <Search size={13} />
              </Link>
            </div>
          )}
        </div>

        <div className="app-header-actions">
          {/* <img className="app-header-avatar" src="https://www.rnsit.ac.in/wp-content/themes/rnsit/img/sticky-header-logo-with-25years.png" alt="" /> */}
          {user?.institution && <span className="app-header-institution">{user.institution}</span>}
          <Link
            className="app-notification-link"
            to="/app/notifications"
            aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            title="Notifications"
          >
            <Bell size={19} strokeWidth={1.8} />
            {unreadCount !== null && unreadCount > 0 && (
              <Badge variant="critical" size="sm" className="app-notification-count">
                {countLabel}
              </Badge>
            )}
          </Link>

          {user && (
            <details className="us-dropdown app-profile-menu">
              <summary>
                <Avatar src={user.avatar} name={user.name} size="sm" />
                <span className="app-profile-copy">
                  <strong>{user.name}</strong>
                  <small>{formatRole(user.role)}</small>
                </span>
                <ChevronDown size={15} aria-hidden="true" />
              </summary>
              <div className="us-dropdown-menu" aria-label="Profile options">
                <div className="app-profile-menu-user">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <DropdownItem onSelect={() => navigate('/app/profile')}>
                  <Avatar src={user.avatar} name={user.name} size="xs" />
                  My profile
                </DropdownItem>
                <DropdownItem onSelect={() => navigate('/app/settings')}>
                  <Settings size={16} />
                  Settings
                </DropdownItem>
                <div className="app-profile-menu-separator" />
                <DropdownItem onSelect={() => void handleLogout()}>Sign out</DropdownItem>
              </div>
            </details>
          )}
        </div>
      </div>
    </header>
  );
}
