import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  FileBarChart,
  FlaskConical,
  Megaphone,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getFacultyAnnouncements,
  getFacultyNotifications,
  type FacultyAnnouncement,
  type FacultyNotification,
} from '../../services/faculty/faculty-api';
import { getEvents, type CampusEvent } from '../../services/events/event-api';
import {
  getAdminStats,
  getInstitutionStats,
} from '../../services/administration/administration-api';
import {
  FacultyEmpty,
  FacultyError,
  FacultyHeading,
  FacultyLoading,
  FacultyMetric,
  FacultyStatus,
} from '../faculty/faculty-components';
import '../faculty/faculty.css';

type Metrics = {
  users: number;
  posts: number;
  communities: number;
  opportunities: number;
  researchPapers: number;
  events: number;
  pendingReports: number;
};
const zero: Metrics = {
  users: 0,
  posts: 0,
  communities: 0,
  opportunities: 0,
  researchPapers: 0,
  events: 0,
  pendingReports: 0,
};
export function AdministrationDashboardPage() {
  const { session, user } = useAuth();
  const [metrics, setMetrics] = useState<Metrics>(zero);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [announcements, setAnnouncements] = useState<FacultyAnnouncement[]>([]);
  const [notifications, setNotifications] = useState<FacultyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const results = await Promise.allSettled([
      isAdmin ? getAdminStats(session.token) : getInstitutionStats(session.token),
      getInstitutionStats(session.token, isAdmin ? user?.institution : undefined),
      getEvents(session.token, { from: new Date().toISOString(), limit: 100 }),
      getFacultyAnnouncements(session.token),
      getFacultyNotifications(session.token),
    ] as const);
    const errors: string[] = [];
    if (results[0].status === 'fulfilled') {
      if ('stats' in results[0].value) {
        const s = results[0].value.stats;
        setMetrics({
          users: s.totalUsers,
          posts: s.totalPosts,
          communities: s.totalCommunities,
          opportunities: s.totalOpportunities,
          researchPapers: 0,
          events: 0,
          pendingReports: s.pendingReports,
        });
      } else setMetrics(results[0].value.analytics);
    } else
      errors.push(
        results[0].reason instanceof ApiError
          ? results[0].reason.message
          : 'Institution statistics could not be loaded.',
      );
    const institutionOverview = results[1];
    if (institutionOverview.status === 'fulfilled') {
      setMetrics((current) => ({
        ...current,
        researchPapers: institutionOverview.value.analytics.researchPapers,
        events: institutionOverview.value.analytics.events,
      }));
    } else
      errors.push(
        institutionOverview.reason instanceof ApiError
          ? institutionOverview.reason.message
          : 'Institution overview could not be loaded.',
      );
    if (results[2].status === 'fulfilled')
      setEvents(
        results[2].value.filter((e) => ['published', 'ongoing'].includes(e.status)).slice(0, 5),
      );
    else
      errors.push(
        results[2].reason instanceof ApiError
          ? results[2].reason.message
          : 'Events could not be loaded.',
      );
    if (results[3].status === 'fulfilled')
      setAnnouncements(results[3].value.announcements.slice(0, 5));
    else
      errors.push(
        results[3].reason instanceof ApiError
          ? results[3].reason.message
          : 'Announcements could not be loaded.',
      );
    if (results[4].status === 'fulfilled') setNotifications(results[4].value.notifications);
    else
      errors.push(
        results[4].reason instanceof ApiError
          ? results[4].reason.message
          : 'Notifications could not be loaded.',
      );
    setError(errors.join(' '));
    setLoading(false);
  }, [session?.token, user?.role, user?.institution]);
  useEffect(() => {
    void load();
  }, [load]);
  const isLeadership = user?.role === 'dean' || user?.role === 'principal';
  const title =
    user?.role === 'dean'
      ? 'Dean overview'
      : user?.role === 'principal'
        ? 'Principal overview'
        : 'Administration dashboard';
  const userPath = '/app/users';
  return (
    <div className="faculty-page administration-dashboard">
      <FacultyHeading
        title={title}
        description={
          user?.institution
            ? `${user.institution} · live data from administrative and institution services`
            : 'Institution management workspace'
        }
      />
      {error && <FacultyError message={error} retry={() => void load()} />}
      <section className="faculty-metrics">
        <FacultyMetric
          label={isLeadership ? 'Institution users' : 'Platform users'}
          value={loading ? '—' : metrics.users}
          icon={<UsersRound />}
          to={userPath}
        />
        <FacultyMetric
          label="Research papers"
          value={loading ? '—' : metrics.researchPapers || '—'}
          icon={<FlaskConical />}
          to="/app/research"
        />
        <FacultyMetric
          label="Institution events"
          value={loading ? '—' : metrics.events || events.length}
          icon={<CalendarDays />}
          to="/app/events"
        />
        <FacultyMetric
          label="Pending reports"
          value={loading ? '—' : metrics.pendingReports}
          icon={<FileBarChart />}
          to="/app/reports"
        />
      </section>
      <nav className="faculty-quick-actions" aria-label="Administrative actions">
        {!isLeadership && (
          <Link to={userPath}>
            <UsersRound />
            <span>
              <strong>Manage users</strong>
              <small>Search and review account status</small>
            </span>
            <ArrowRight />
          </Link>
        )}
        <Link to="/app/announcements">
          <Megaphone />
          <span>
            <strong>Announcements</strong>
            <small>Create and manage institutional updates</small>
          </span>
          <ArrowRight />
        </Link>
        <Link to="/app/events">
          <CalendarDays />
          <span>
            <strong>Events</strong>
            <small>Manage event lifecycle and registrations</small>
          </span>
          <ArrowRight />
        </Link>
        <Link to="/app/reports">
          <FileBarChart />
          <span>
            <strong>Reports and audit</strong>
            <small>Review reports and administration history</small>
          </span>
          <ArrowRight />
        </Link>
      </nav>
      <div className="faculty-dashboard-columns">
        <section className="faculty-panel">
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">CAMPUS ACTIVITY</span>
              <h2>Upcoming events</h2>
            </div>
            <Link to="/app/events">
              Manage events <ArrowRight size={14} />
            </Link>
          </header>
          {loading ? (
            <FacultyLoading />
          ) : events.length ? (
            <div className="faculty-list">
              {events.map((event) => (
                <Link key={event._id} to={`/app/events/${event._id}`}>
                  <div>
                    <strong>{event.title}</strong>
                    <small>
                      {new Date(event.startDate).toLocaleString()} ·{' '}
                      {event.venue || event.mode || 'Venue not listed'}
                    </small>
                  </div>
                  <FacultyStatus status={event.status} />
                </Link>
              ))}
            </div>
          ) : (
            <FacultyEmpty
              title="No upcoming events"
              description="Published and ongoing institution events will appear here."
            />
          )}
        </section>
        <section className="faculty-panel">
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">INSTITUTION COMMUNICATION</span>
              <h2>Announcements</h2>
            </div>
            <Link to="/app/announcements">
              Manage <ArrowRight size={14} />
            </Link>
          </header>
          {loading ? (
            <FacultyLoading />
          ) : announcements.length ? (
            <div className="faculty-announcement-list">
              {announcements.map((item) => (
                <article key={item._id}>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.category} · {new Date(item.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  <p>{item.content}</p>
                </article>
              ))}
            </div>
          ) : (
            <FacultyEmpty
              title="No announcements"
              description="Published announcements will appear here."
            />
          )}
        </section>
        <section className="faculty-panel">
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">INSTITUTION DATA</span>
              <h2>Overview</h2>
            </div>
            <BookOpen size={18} />
          </header>
          <div className="admin-overview-values">
            <span>
              Posts <strong>{loading ? '—' : metrics.posts}</strong>
            </span>
            <span>
              Communities <strong>{loading ? '—' : metrics.communities}</strong>
            </span>
            <span>
              Opportunities <strong>{loading ? '—' : metrics.opportunities}</strong>
            </span>
            {user?.role === 'admin' || user?.role === 'superadmin' ? (
              <span>
                All institutions <strong>As reported by admin stats</strong>
              </span>
            ) : null}
          </div>
          <p className="faculty-data-note">
            <BriefcaseBusiness size={14} />
            Metrics are sourced directly from the current role's institution stats endpoint.
          </p>
        </section>
        <section className="faculty-panel">
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">ADMINISTRATIVE ACTIVITY</span>
              <h2>Notifications</h2>
            </div>
            <Link to="/app/notifications">
              All notifications <ArrowRight size={14} />
            </Link>
          </header>
          {loading ? (
            <FacultyLoading />
          ) : notifications.length ? (
            <div className="faculty-notification-list">
              {notifications.slice(0, 5).map((n) => (
                <article key={n._id} className={!n.isRead ? 'unread' : ''}>
                  <span className="faculty-notification-dot" />
                  <div>
                    <strong>{n.message}</strong>
                    <small>
                      <Bell size={12} /> {n.type.replaceAll('_', ' ')} ·{' '}
                      {new Date(n.createdAt).toLocaleString()}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <FacultyEmpty
              title="No recent notifications"
              description="Administrative updates will appear here."
            />
          )}
        </section>
      </div>
    </div>
  );
}
