import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  GraduationCap,
  LoaderCircle,
  Ticket,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/useAuth';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { Modal } from '../../components/ui';
import { ApiError } from '../../services/api';
import {
  getCampusEvents,
  registerForEvent,
  type CampusEvent,
} from '../../services/events/event-api';
import { getNavigationForRole } from '../../layouts/navigation-config';
import './student-dashboard.css';

const dashboardCards = [
  {
    title: 'Academics',
    subtitle: 'Academic performance and attendance.',
    to: '/app/academics',
    icon: GraduationCap,
  },
  {
    title: 'Events Register',
    subtitle: 'Discover and register for campus events.',
    to: '/app/events',
    icon: Ticket,
  },
  {
    title: 'Calendar of Events',
    subtitle: 'Academic and institutional schedules.',
    to: '/app/calendar',
    icon: CalendarDays,
  },
  {
    title: 'Research and Development',
    subtitle: 'Publications, projects, and research.',
    to: '/app/research',
    icon: FlaskConical,
  },
  {
    title: 'Career Connect',
    subtitle: 'Alumni, mentorship, and career guidance.',
    to: '/app/career-connect',
    icon: UsersRound,
  },
  {
    title: 'Placements',
    subtitle: 'Placement opportunities and applications.',
    to: '/app/placements',
    icon: Building2,
  },
];

function eventImage(event: CampusEvent): string | undefined {
  return event.flyerUrl || event.files?.find((file) => file.fileType === 'flyer')?.url;
}

function eventRegistrationStatus(event: CampusEvent, now: number): string {
  const opens = event.registrationOpenDate
    ? new Date(event.registrationOpenDate).getTime()
    : Number.NEGATIVE_INFINITY;
  const closes = event.registrationCloseDate
    ? new Date(event.registrationCloseDate).getTime()
    : Number.POSITIVE_INFINITY;
  if (event.status === 'completed') return 'Event ended';
  if (event.status !== 'ongoing' && now < opens)
    return `Registration opens ${new Date(opens).toLocaleDateString()}`;
  if (now > closes) return 'Registration closed';
  return 'Registration open';
}

export function DashboardPage() {
  const { user, session } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [registeringId, setRegisteringId] = useState('');
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const carouselRef = useRef<HTMLDivElement>(null);
  const unreadCount = useUnreadNotifications(session?.token);
  const fetchEvents = useCallback(async () => {
    if (!session?.token || user?.role !== 'student') {
      setLoadingEvents(false);
      return;
    }
    setLoadingEvents(true);
    setEventsError('');
    try {
      const items = await getCampusEvents(session.token);
      setEvents(
        items.filter((event) => event.status === 'published' || event.status === 'ongoing'),
      );
    } catch (error) {
      setEventsError(
        error instanceof ApiError ? error.message : 'Campus events could not be loaded.',
      );
    } finally {
      setLoadingEvents(false);
    }
  }, [session?.token, user?.role]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  }, []);

  function scrollCarousel(direction: -1 | 1) {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const firstCard = carousel.querySelector<HTMLElement>('.student-event-card');
    carousel.scrollBy({
      left: direction * ((firstCard?.offsetWidth ?? 300) + 16),
      behavior: 'smooth',
    });
  }

  async function handleRegister(event: CampusEvent) {
    if (!session?.token) return;
    setRegisteringId(event._id);
    setRegistrationMessage('');
    setRegistrationError('');
    try {
      const { registration } = await registerForEvent(session.token, event._id);
      setRegistrationMessage(
        registration.status === 'waitlisted'
          ? `You are on the waitlist${registration.waitlistPosition ? ` at position ${registration.waitlistPosition}` : ''}.`
          : 'Your event registration is confirmed.',
      );
    } catch (error) {
      setRegistrationError(
        error instanceof ApiError ? error.message : 'Registration could not be completed.',
      );
    } finally {
      setRegisteringId('');
    }
  }

  const profileInitials =
    user?.name
      ?.split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() ?? '';
  const now = Date.now();
  const canRegister = (event: CampusEvent) => {
    const status = eventRegistrationStatus(event, now);
    return status === 'Registration open' && !event.isTeamEvent;
  };

  if (user && user.role !== 'student') {
    const roleLinks = getNavigationForRole(user.role)
      .flatMap((section) => section.items)
      .filter((item) => item.path !== '/app');
    return (
      <section className="student-dashboard role-dashboard">
        <div className="student-welcome">
          <div className="student-welcome-copy">
            <div className="eyebrow">UNISPHERE WORKSPACE</div>
            <h1>
              {greeting}, {user.name}
            </h1>
            <p>{[user.institution, user.department, user.role].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <div className="student-section-heading">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h2>Continue where you need to</h2>
          </div>
        </div>
        <div className="student-destination-grid">
          {roleLinks.map(({ path, label, icon: Icon }) => (
            <Link className="student-destination-card" to={path} key={path}>
              <span className="student-destination-icon">
                <Icon size={21} />
              </span>
              <span className="student-destination-copy">
                <strong>{label}</strong>
                <small>Open your {label.toLowerCase()} workspace.</small>
              </span>
              <ArrowRight size={17} className="student-destination-arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="student-dashboard">
      <section className="student-welcome" aria-labelledby="student-welcome-title">
        <div className="student-welcome-copy">
          <div className="eyebrow">STUDENT DASHBOARD</div>
          <h1 id="student-welcome-title">
            {greeting}, {user?.name ?? 'Student'}
          </h1>
          <p>
            {[user?.institution, user?.department].filter(Boolean).join(' · ') ||
              'Your UniSphere campus workspace'}
          </p>
          {unreadCount !== null && unreadCount > 0 && (
            <Link className="student-notification-link" to="/app/notifications">
              {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}{' '}
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
        <Link
          to="/app/profile"
          className="student-profile-link"
          aria-label={`View ${user?.name ?? 'student'} profile`}
        >
          {user?.avatar ? <img src={user.avatar} alt="" /> : <span>{profileInitials}</span>}
          <span className="student-profile-copy">
            <strong>{user?.name}</strong>
            <small>{user?.department || 'Student'}</small>
          </span>
        </Link>
      </section>

      <section className="student-events-section" aria-labelledby="student-events-title">
        <div className="student-section-heading">
          <div>
            <span className="eyebrow">HAPPENING ON CAMPUS</span>
            <h2 id="student-events-title">Campus events</h2>
          </div>
          <div className="student-carousel-controls">
            <Link to="/app/events" className="student-view-all">
              View all <ArrowRight size={14} />
            </Link>
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              aria-label="Previous events"
              disabled={loadingEvents || events.length === 0}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              aria-label="Next events"
              disabled={loadingEvents || events.length === 0}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        {loadingEvents ? (
          <div className="student-event-loading" role="status">
            <LoaderCircle size={19} className="student-spin" /> Loading campus events…
          </div>
        ) : eventsError ? (
          <div className="student-event-state student-event-error" role="alert">
            <span>{eventsError}</span>
            <button type="button" onClick={() => void fetchEvents()}>
              Try again
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="student-event-state">
            <CalendarRange size={20} />
            <span>No upcoming campus events are available.</span>
          </div>
        ) : (
          <div
            className="student-event-carousel"
            ref={carouselRef}
            role="region"
            aria-roledescription="carousel"
            aria-label="Upcoming campus events"
          >
            {events.map((event) => {
              const image = eventImage(event);
              const status = eventRegistrationStatus(event, now);
              return (
                <article className="student-event-card" key={event._id}>
                  <div className="student-event-banner">
                    {image ? (
                      <img src={image} alt="" loading="lazy" />
                    ) : (
                      <div className="student-event-placeholder">
                        <CalendarRange size={25} />
                        <span>{event.category || 'Campus event'}</span>
                      </div>
                    )}
                    <span
                      className={`student-event-status ${status === 'Registration open' ? 'is-open' : ''}`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="student-event-content">
                    <time dateTime={event.startDate}>
                      {new Date(event.startDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <button
                      className="student-event-action"
                      type="button"
                      onClick={() => {
                        setSelectedEvent(event);
                        setRegistrationMessage('');
                        setRegistrationError('');
                      }}
                    >
                      {canRegister(event) ? 'Register' : 'View details'} <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="student-destinations" aria-labelledby="student-destinations-title">
        <div className="student-section-heading student-destinations-heading">
          <div>
            <span className="eyebrow">YOUR CAMPUS WORKSPACE</span>
            <h2 id="student-destinations-title">Explore your UniSphere</h2>
          </div>
        </div>
        <div className="student-destination-grid">
          {dashboardCards.map(({ title, subtitle, to, icon: Icon }) => (
            <Link className="student-destination-card" to={to} key={title}>
              <span className="student-destination-icon">
                <Icon size={21} strokeWidth={1.8} />
              </span>
              <span className="student-destination-copy">
                <strong>{title}</strong>
                <small>{subtitle}</small>
              </span>
              <ArrowRight size={17} className="student-destination-arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <Modal
        open={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title ?? 'Event details'}
        description={selectedEvent?.category || 'Campus event'}
        footer={
          selectedEvent && (
            <>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
              {canRegister(selectedEvent) && (
                <button
                  className="button button-primary"
                  type="button"
                  disabled={registeringId === selectedEvent._id || Boolean(registrationMessage)}
                  onClick={() => void handleRegister(selectedEvent)}
                >
                  {registeringId === selectedEvent._id ? (
                    <>
                      <LoaderCircle size={15} className="student-spin" /> Registering…
                    </>
                  ) : registrationMessage ? (
                    <>
                      <CheckCircle2 size={15} /> Registered
                    </>
                  ) : (
                    <>
                      Register <ArrowRight size={15} />
                    </>
                  )}
                </button>
              )}
            </>
          )
        }
      >
        {selectedEvent && (
          <div className="student-event-modal-content">
            {eventImage(selectedEvent) && (
              <img className="student-dialog-image" src={eventImage(selectedEvent)} alt="" />
            )}
            <p>{selectedEvent.description}</p>
            <dl className="student-event-details">
              <div>
                <dt>Date</dt>
                <dd>{new Date(selectedEvent.startDate).toLocaleString()}</dd>
              </div>
              {selectedEvent.venue && (
                <div>
                  <dt>Venue</dt>
                  <dd>{selectedEvent.venue}</dd>
                </div>
              )}
              <div>
                <dt>Registration</dt>
                <dd>{eventRegistrationStatus(selectedEvent, Date.now())}</dd>
              </div>
            </dl>
            {(registrationMessage || registrationError) && (
              <p
                className={
                  registrationError ? 'student-registration-error' : 'student-registration-success'
                }
                role={registrationError ? 'alert' : 'status'}
              >
                {registrationError || registrationMessage}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
