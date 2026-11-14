import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ClipboardCheck,
  FilePlus2,
  FlaskConical,
  Megaphone,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, Badge } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import { getMyTimetable, type TimetableSlot } from '../../services/academics/academic-api';
import { getEvents, type CampusEvent } from '../../services/events/event-api';
import {
  getMyResearchPapers,
  getResearchAssignments,
  type ResearchAssignment,
  type ResearchPaper,
} from '../../services/research/research-api';
import {
  getFacultyAnnouncements,
  getFacultyNotifications,
  type FacultyAnnouncement,
  type FacultyNotification,
} from '../../services/faculty/faculty-api';
import {
  FacultyEmpty,
  FacultyError,
  FacultyHeading,
  FacultyLoading,
  FacultyMetric,
  FacultyStatus,
} from './faculty-components';
import { facultyPaths } from './faculty-paths';
import './faculty.css';

const weekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function time(value: number) {
  return new Date(2000, 0, 1, Math.floor(value / 60), value % 60).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}
function userId(value: string | { _id: string } | undefined) {
  return typeof value === 'string' ? value : value?._id;
}

export function FacultyDashboardPage() {
  const { session, user } = useAuth();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [assignments, setAssignments] = useState<ResearchAssignment[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [announcements, setAnnouncements] = useState<FacultyAnnouncement[]>([]);
  const [notifications, setNotifications] = useState<FacultyNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      getMyResearchPapers(session.token),
      getResearchAssignments(session.token),
      getMyTimetable(session.token),
      getEvents(session.token, { from: new Date().toISOString(), limit: 100 }),
      getFacultyAnnouncements(session.token),
      getFacultyNotifications(session.token),
    ]);
    const failures: string[] = [];
    if (results[0].status === 'fulfilled') setPapers(results[0].value);
    else
      failures.push(
        results[0].reason instanceof ApiError
          ? results[0].reason.message
          : 'Research activity could not be loaded.',
      );
    if (results[1].status === 'fulfilled') setAssignments(results[1].value);
    else
      failures.push(
        results[1].reason instanceof ApiError
          ? results[1].reason.message
          : 'Research review assignments could not be loaded.',
      );
    if (results[2].status === 'fulfilled') setSlots(results[2].value);
    else
      failures.push(
        results[2].reason instanceof ApiError
          ? results[2].reason.message
          : 'Teaching timetable could not be loaded.',
      );
    if (results[3].status === 'fulfilled')
      setEvents(
        results[3].value
          .filter((event) => ['published', 'ongoing'].includes(event.status))
          .slice(0, 4),
      );
    else
      failures.push(
        results[3].reason instanceof ApiError
          ? results[3].reason.message
          : 'Campus events could not be loaded.',
      );
    if (results[4].status === 'fulfilled')
      setAnnouncements(results[4].value.announcements.slice(0, 4));
    else
      failures.push(
        results[4].reason instanceof ApiError
          ? results[4].reason.message
          : 'Announcements could not be loaded.',
      );
    if (results[5].status === 'fulfilled') {
      setNotifications(results[5].value.notifications);
      setUnread(results[5].value.unreadCount);
    } else
      failures.push(
        results[5].reason instanceof ApiError
          ? results[5].reason.message
          : 'Notifications could not be loaded.',
      );
    setError(failures.join(' '));
    setLoading(false);
  }, [session?.token]);
  useEffect(() => {
    void load();
  }, [load]);
  const waiting = useMemo(
    () =>
      papers.filter(
        (p) =>
          p.isStudentSubmission &&
          ((p.lifecycleStatus === 'pending_proctor' &&
            (p.assignedProctorId === user?._id ||
              user?.responsibilities?.includes('proctor'))) ||
            (p.lifecycleStatus === 'pending_guide' &&
              (p.assignedProjectGuideIds?.includes(user?._id || '') ||
                p.assignedProjectGuideId === user?._id))),
      ),
    [papers, user?._id, user?.responsibilities],
  );
  const authored = papers.filter((p) => userId(p.submittedBy) === user?._id);
  const activeAssignments = assignments.filter((a) => a.status === 'active');
  const schedule = useMemo(
    () =>
      [...slots]
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinutes - b.startMinutes)
        .slice(0, 5),
    [slots],
  );
  return (
    <div className="faculty-page">
      <FacultyHeading
        title={`Good day, ${user?.name?.split(' ')[0] || 'Faculty'}`}
        description="Your teaching schedule, research work, student reviews, and campus activity in one place."
      />
      <div className="faculty-profile-banner">
        <Avatar name={user?.name || 'Faculty'} src={user?.avatar} size="xl" />
        <div>
          <span className="eyebrow">FACULTY PROFILE</span>
          <h2>{user?.name}</h2>
          <p>
            {user?.headline || 'Faculty member'}
            {user?.department ? ` · ${user.department}` : ''}
          </p>
          <small>{user?.institution}</small>
        </div>
        <Link to="/app/profile" className="faculty-inline-link">
          View profile <ArrowRight size={14} />
        </Link>
      </div>
      {error && <FacultyError message={error} retry={() => void load()} />}
      <section className="faculty-metrics">
        <FacultyMetric
          label="Student papers awaiting review"
          value={loading ? '—' : waiting.length}
          icon={<ClipboardCheck />}
          to={facultyPaths.submissions}
        />
        <FacultyMetric
          label="Research records"
          value={loading ? '—' : authored.length}
          icon={<FlaskConical />}
          to={facultyPaths.research}
        />
        <FacultyMetric
          label="Active review assignments"
          value={loading ? '—' : activeAssignments.length}
          icon={<UsersRound />}
          to={facultyPaths.submissions}
        />
        <FacultyMetric
          label="Unread notifications"
          value={loading ? '—' : unread}
          icon={<Bell />}
          to={facultyPaths.notifications}
        />
      </section>
      <nav className="faculty-quick-actions" aria-label="Faculty quick actions">
        <Link to={facultyPaths.announcements}>
          <Megaphone size={17} />
          <span>
            <strong>New announcement</strong>
            <small>Publish a targeted department update</small>
          </span>
          <ArrowRight size={15} />
        </Link>
        <Link to={facultyPaths.research}>
          <FilePlus2 size={17} />
          <span>
            <strong>Add research</strong>
            <small>Create a publication or dataset record</small>
          </span>
          <ArrowRight size={15} />
        </Link>
        <Link to={facultyPaths.submissions}>
          <ClipboardCheck size={17} />
          <span>
            <strong>Review student work</strong>
            <small>Open institutional Proctor or assigned Guide reviews</small>
          </span>
          <ArrowRight size={15} />
        </Link>
        <Link to={facultyPaths.newEvent}>
          <CalendarDays size={17} />
          <span>
            <strong>Propose an event</strong>
            <small>Submit an event for the institution workflow</small>
          </span>
          <ArrowRight size={15} />
        </Link>
      </nav>
      <div className="faculty-dashboard-columns">
        <section className="faculty-panel">
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">ACADEMIC ACTIVITIES</span>
              <h2>Teaching timetable</h2>
            </div>
            <Link to={facultyPaths.academics}>
              Full schedule <ArrowRight size={14} />
            </Link>
          </header>
          {loading ? (
            <FacultyLoading />
          ) : schedule.length ? (
            <div className="faculty-schedule-list">
              {schedule.map((slot) => (
                <article key={slot._id}>
                  <span>{weekday[slot.dayOfWeek - 1] || `Day ${slot.dayOfWeek}`}</span>
                  <div>
                    <strong>
                      {slot.courseName} <small>{slot.courseCode}</small>
                    </strong>
                    <small>
                      {time(slot.startMinutes)}–{time(slot.endMinutes)} · {slot.roomNumber} ·
                      Semester {slot.semester}
                    </small>
                  </div>
                  <Badge variant="outline" size="sm">
                    {slot.sessionType}
                  </Badge>
                </article>
              ))}
            </div>
          ) : (
            <FacultyEmpty
              title="No published timetable entries"
              description="Teaching sessions will appear here when published by the institution."
            />
          )}
        </section>
        <section className="faculty-panel">
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">STUDENT SUBMISSIONS</span>
              <h2>Reviews awaiting your action</h2>
            </div>
            <Link to={facultyPaths.submissions}>
              Open review queue <ArrowRight size={14} />
            </Link>
          </header>
          {loading ? (
            <FacultyLoading />
          ) : waiting.length ? (
            <div className="faculty-list">
              {waiting.slice(0, 5).map((paper) => (
                <Link key={paper._id} to={`/app/research/papers/${paper._id}`}>
                  <div>
                    <strong>{paper.title}</strong>
                    <small>
                      {paper.subject} · revision {paper.revisionRound || 1}
                    </small>
                  </div>
                  <FacultyStatus status={paper.lifecycleStatus || 'submitted'} />
                </Link>
              ))}
            </div>
          ) : (
            <FacultyEmpty
              title="No submissions awaiting review"
              description="Your assigned student papers will appear here at the correct workflow stage."
            />
          )}
        </section>
        <section className="faculty-panel">
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">RESEARCH</span>
              <h2>Your research activity</h2>
            </div>
            <Link to={facultyPaths.research}>
              Research workspace <ArrowRight size={14} />
            </Link>
          </header>
          {loading ? (
            <FacultyLoading />
          ) : authored.length ? (
            <div className="faculty-list">
              {authored.slice(0, 4).map((paper) => (
                <Link key={paper._id} to={`/app/research/papers/${paper._id}`}>
                  <div>
                    <strong>{paper.title}</strong>
                    <small>
                      {paper.publicationType} · {paper.subject}
                    </small>
                  </div>
                  <FacultyStatus status={paper.lifecycleStatus || 'published'} />
                </Link>
              ))}
            </div>
          ) : (
            <FacultyEmpty
              title="No faculty research records"
              description="Create a publication or dataset from the research workspace."
              action={<Link to={facultyPaths.research}>Open research</Link>}
            />
          )}
        </section>
        <section className="faculty-panel">
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">CAMPUS EVENTS</span>
              <h2>Upcoming institutional events</h2>
            </div>
            <Link to="/app/events">
              Browse events <ArrowRight size={14} />
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
              description="Published campus events will appear here."
            />
          )}
        </section>
        <section className="faculty-panel">
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">ANNOUNCEMENTS</span>
              <h2>Recent announcements</h2>
            </div>
            <Link to={facultyPaths.announcements}>
              View announcements <ArrowRight size={14} />
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
                  {item.isPinned && (
                    <Badge variant="brand" size="sm">
                      Pinned
                    </Badge>
                  )}
                  <p>{item.content}</p>
                </article>
              ))}
            </div>
          ) : (
            <FacultyEmpty
              title="No visible announcements"
              description="Announcements targeted to your account will appear here."
            />
          )}
        </section>
        <section className="faculty-panel">
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">NOTIFICATIONS</span>
              <h2>Recent activity</h2>
            </div>
            <Link to={facultyPaths.notifications}>
              Open notifications <ArrowRight size={14} />
            </Link>
          </header>
          {loading ? (
            <FacultyLoading />
          ) : notifications.length ? (
            <div className="faculty-notification-list">
              {notifications.slice(0, 4).map((notification) => (
                <article key={notification._id} className={!notification.isRead ? 'unread' : ''}>
                  <span className="faculty-notification-dot" />
                  <div>
                    <strong>{notification.message}</strong>
                    <small>
                      {notification.type.replaceAll('_', ' ')} ·{' '}
                      {new Date(notification.createdAt).toLocaleString()}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <FacultyEmpty
              title="No notifications"
              description="Faculty workflow updates will appear here."
            />
          )}
        </section>
      </div>
    </div>
  );
}
