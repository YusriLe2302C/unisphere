import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarClock,
  ClipboardList,
  GraduationCap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getMyPlacementApplications,
  getPlacementAnnouncements,
  getPlacementOpportunities,
  type PlacementAnnouncement,
  type PlacementApplication,
  type PlacementOpportunity,
} from '../../services/placements/placement-api';
import {
  PlacementEmpty,
  PlacementError,
  PlacementHeading,
  PlacementLoading,
  PlacementOpportunityCard,
  PlacementStatus,
} from './placement-components';
import { placementPaths } from './placement-paths';
import './placements.css';

export function PlacementsDashboardPage() {
  const { session, user } = useAuth();
  const [opportunities, setOpportunities] = useState<PlacementOpportunity[]>([]);
  const [applications, setApplications] = useState<PlacementApplication[]>([]);
  const [announcements, setAnnouncements] = useState<PlacementAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token || !user?.institution) return;
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      getPlacementOpportunities(user.institution),
      getMyPlacementApplications(session.token),
      getPlacementAnnouncements(session.token),
    ]);
    const errors: string[] = [];
    if (results[0].status === 'fulfilled') setOpportunities(results[0].value.opportunities);
    else
      errors.push(
        results[0].reason instanceof ApiError
          ? results[0].reason.message
          : 'Placement opportunities could not be loaded.',
      );
    if (results[1].status === 'fulfilled') setApplications(results[1].value.applications);
    else
      errors.push(
        results[1].reason instanceof ApiError
          ? results[1].reason.message
          : 'Your applications could not be loaded.',
      );
    if (results[2].status === 'fulfilled') {
      setAnnouncements(
        results[2].value.announcements
          .filter((item) =>
            /placement|recruit|interview|career fair|company talk/i.test(
              `${item.category} ${item.title} ${item.content}`,
            ),
          )
          .slice(0, 5),
      );
    } else
      errors.push(
        results[2].reason instanceof ApiError
          ? results[2].reason.message
          : 'Announcements could not be loaded.',
      );
    setError(errors.join(' '));
    setLoading(false);
  }, [session?.token, user?.institution]);
  useEffect(() => {
    void load();
  }, [load]);
  const applied = applications.filter((application) => application.status !== 'withdrawn');
  const companies = new Set(opportunities.map((opportunity) => opportunity.organization)).size;
  const upcomingInterviews = applications.flatMap((application) =>
    application.interviewRounds
      .filter(
        (round) =>
          round.status === 'scheduled' &&
          round.scheduledAt &&
          new Date(round.scheduledAt).getTime() >= Date.now(),
      )
      .map((round) => ({ application, round })),
  );
  const applicationByOpportunity = new Map(
    applications.map((application) => [
      typeof application.opportunity === 'string'
        ? application.opportunity
        : application.opportunity._id,
      application,
    ]),
  );
  const upcomingDeadlines = opportunities
    .filter((opportunity) => {
      const deadline = opportunity.applicationDeadline || opportunity.deadline;
      return deadline && new Date(deadline).getTime() >= Date.now();
    })
    .sort(
      (a, b) =>
        new Date(a.applicationDeadline || a.deadline || '').getTime() -
        new Date(b.applicationDeadline || b.deadline || '').getTime(),
    )
    .slice(0, 3);

  return (
    <div className="placement-page">
      <PlacementHeading
        title="Student placements"
        description="Explore institutional placement drives, review your applications, and track interview schedules."
        action={
          <Link className="button button-primary" to={placementPaths.opportunities}>
            <Building2 size={16} /> Browse opportunities
          </Link>
        }
      />
      {error && <PlacementError message={error} onRetry={() => void load()} />}
      {user?.role !== 'student' && (
        <p className="placement-note">
          Placement applications are submitted by student accounts. Your session is authenticated as{' '}
          {user?.role}.
        </p>
      )}
      <section className="placement-stats" aria-label="Placement overview">
        <Card>
          <Building2 />
          <small>Available companies</small>
          <strong>{loading ? '—' : companies}</strong>
          <Link to={placementPaths.opportunities}>
            Browse drives <ArrowRight size={14} />
          </Link>
        </Card>
        <Card>
          <ClipboardList />
          <small>My applications</small>
          <strong>{loading ? '—' : applied.length}</strong>
          <Link to={placementPaths.applications}>
            View application status <ArrowRight size={14} />
          </Link>
        </Card>
        <Card>
          <CalendarClock />
          <small>Upcoming interviews</small>
          <strong>{loading ? '—' : upcomingInterviews.length}</strong>
          <Link to={placementPaths.applications}>
            Review schedule <ArrowRight size={14} />
          </Link>
        </Card>
        <Card>
          <GraduationCap />
          <small>Academic profile</small>
          <strong>{user?.batch || '—'}</strong>
          <span>
            {user?.department || 'Academic details unavailable'}
            {user?.semester ? ` · Semester ${user.semester}` : ''}
          </span>
        </Card>
      </section>
      <div className="placement-dashboard-grid">
        <section className="placement-panel">
          <header className="placement-panel-heading">
            <div>
              <span className="eyebrow">OPEN DRIVES</span>
              <h2>Featured placement opportunities</h2>
            </div>
            <Link to={placementPaths.opportunities}>
              All opportunities <ArrowRight size={14} />
            </Link>
          </header>
          {loading ? (
            <PlacementLoading />
          ) : opportunities.length ? (
            <div className="placement-opportunity-grid">
              {opportunities.slice(0, 4).map((opportunity) => (
                <PlacementOpportunityCard
                  key={opportunity._id}
                  opportunity={opportunity}
                  application={applicationByOpportunity.get(opportunity._id)}
                />
              ))}
            </div>
          ) : (
            <PlacementEmpty
              title="No active placement drives"
              description="Placement opportunities will appear when the placement cell publishes them."
            />
          )}
        </section>
        <div className="placement-side-stack">
          <section className="placement-panel">
            <header className="placement-panel-heading">
              <div>
                <span className="eyebrow">APPLICATIONS</span>
                <h2>Recent status updates</h2>
              </div>
              <Link to={placementPaths.applications}>View all</Link>
            </header>
            {loading ? (
              <PlacementLoading />
            ) : applied.length ? (
              <div className="placement-application-mini-list">
                {applied.slice(0, 4).map((application) => {
                  const opportunity =
                    typeof application.opportunity === 'string'
                      ? undefined
                      : application.opportunity;
                  return (
                    <Link
                      key={application._id}
                      to={`${placementPaths.applications}/${application._id}`}
                    >
                      <div>
                        <strong>{opportunity?.organization || 'Placement company'}</strong>
                        <small>{opportunity?.title || application.roleApplied}</small>
                      </div>
                      <PlacementStatus status={application.status} />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <PlacementEmpty
                title="No applications yet"
                description="Your submitted placement applications will be listed here."
              />
            )}
          </section>
          <section className="placement-panel">
            <header className="placement-panel-heading">
              <div>
                <span className="eyebrow">INTERVIEW SCHEDULE</span>
                <h2>Upcoming rounds</h2>
              </div>
            </header>
            {loading ? (
              <PlacementLoading />
            ) : upcomingInterviews.length ? (
              <div className="placement-interview-list">
                {upcomingInterviews.slice(0, 4).map(({ application, round }, index) => (
                  <article key={`${application._id}-${round.name}-${index}`}>
                    <span className="placement-timeline-dot" />
                    <div>
                      <strong>{round.name}</strong>
                      <small>
                        {typeof application.opportunity === 'object'
                          ? application.opportunity.organization
                          : application.roleApplied}
                      </small>
                      <small>{new Date(round.scheduledAt!).toLocaleString()}</small>
                      {round.notes && <p>{round.notes}</p>}
                    </div>
                    <PlacementStatus status={round.status} />
                  </article>
                ))}
              </div>
            ) : (
              <PlacementEmpty
                title="No interviews scheduled"
                description="Scheduled interview rounds will appear when the placement cell updates your application."
              />
            )}
          </section>
        </div>
      </div>
      <div className="placement-dashboard-grid placement-dashboard-lower">
        <section className="placement-panel">
          <header className="placement-panel-heading">
            <div>
              <span className="eyebrow">UPCOMING DATES</span>
              <h2>Application deadlines</h2>
            </div>
          </header>
          {loading ? (
            <PlacementLoading />
          ) : upcomingDeadlines.length ? (
            <div className="placement-deadline-list">
              {upcomingDeadlines.map((opportunity) => (
                <Link
                  key={opportunity._id}
                  to={`${placementPaths.opportunities}/${opportunity._id}`}
                >
                  <div>
                    <strong>{opportunity.organization}</strong>
                    <small>{opportunity.title}</small>
                  </div>
                  <Badge variant="warning" size="sm">
                    {new Date(
                      opportunity.applicationDeadline || opportunity.deadline!,
                    ).toLocaleDateString()}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <PlacementEmpty
              title="No upcoming deadlines"
              description="No active placement deadline is currently listed."
            />
          )}
        </section>
        <section className="placement-panel">
          <header className="placement-panel-heading">
            <div>
              <span className="eyebrow">PLACEMENT CELL</span>
              <h2>Announcements</h2>
            </div>
            <BellRing size={17} />
          </header>
          {loading ? (
            <PlacementLoading />
          ) : announcements.length ? (
            <div className="placement-announcement-list">
              {announcements.map((item) => (
                <article key={item._id}>
                  <div>
                    <Badge variant={item.isPinned ? 'brand' : 'outline'} size="sm">
                      {item.category}
                    </Badge>
                    <small>{new Date(item.createdAt).toLocaleDateString()}</small>
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.content}</p>
                </article>
              ))}
            </div>
          ) : (
            <PlacementEmpty
              title="No placement announcements"
              description="Announcements that mention placement activity will appear here when published."
            />
          )}
        </section>
      </div>
    </div>
  );
}
