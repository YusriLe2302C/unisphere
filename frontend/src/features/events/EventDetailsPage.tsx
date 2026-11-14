import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Search,
  Ticket,
  UsersRound,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Input, Spinner } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError, apiRequest } from '../../services/api';
import {
  cancelEventRegistration,
  getEvent,
  registerForEvent,
  type CampusEvent,
} from '../../services/events/event-api';
import {
  formatEventDate,
  getEventImage,
  getOrganizerLabel,
  getRegistrationAvailability,
} from './event-format';
import './events.css';

interface SearchUser {
  _id: string;
  name: string;
  department?: string;
  role?: string;
}

export function EventDetailsPage() {
  const { eventId = '' } = useParams();
  const { session, user } = useAuth();
  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<SearchUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!session?.token || !eventId) return;
    setLoading(true);
    setError('');
    try {
      setEvent(await getEvent(session.token, eventId));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Event details could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.token, eventId]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (
      !event?.isTeamEvent ||
      !session?.token ||
      !user?.institution ||
      memberSearch.trim().length < 2
    ) {
      setMemberResults([]);
      return;
    }
    let active = true;
    const timeout = window.setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const result = await apiRequest<{ users: SearchUser[]; total: number }>('users', {
          token: session.token,
          query: { q: memberSearch.trim(), institution: user.institution, limit: 10, page: 1 },
        });
        if (active)
          setMemberResults(
            result.users.filter(
              (candidate) =>
                candidate._id !== user._id &&
                !selectedMembers.some((selected) => selected._id === candidate._id),
            ),
          );
      } catch {
        if (active) setMemberResults([]);
      } finally {
        if (active) setSearchingMembers(false);
      }
    }, 280);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [
    event?.isTeamEvent,
    session?.token,
    user?.institution,
    user?._id,
    memberSearch,
    selectedMembers,
  ]);

  const registration = event?.myRegistration ?? null;
  const availability = useMemo(() => (event ? getRegistrationAvailability(event) : null), [event]);
  const hasActiveRegistration = Boolean(
    registration && ['registered', 'waitlisted', 'attended'].includes(registration.status),
  );
  const minMembers = Math.max(0, (event?.minTeamSize ?? 1) - 1);
  const maxMembers = Math.max(minMembers, (event?.maxTeamSize ?? minMembers + 1) - 1);
  const teamReady =
    !event?.isTeamEvent ||
    (selectedMembers.length >= minMembers && selectedMembers.length <= maxMembers);

  async function handleRegister() {
    if (!session?.token || !event) return;
    setBusy(true);
    setActionError('');
    setActionMessage('');
    try {
      const result = await registerForEvent(
        session.token,
        event._id,
        event.isTeamEvent
          ? {
              teamName: teamName.trim(),
              teamMembers: selectedMembers.map(({ _id }) => ({ userId: _id })),
            }
          : {},
      );
      setEvent((current) =>
        current ? { ...current, myRegistration: result.registration } : current,
      );
      setActionMessage(
        result.idempotentReplay
          ? `You already have an active registration (${result.registration.status}).`
          : result.registration.status === 'waitlisted'
            ? `You’re on the waitlist${result.registration.waitlistPosition ? ` at position ${result.registration.waitlistPosition}` : ''}.`
            : 'Your registration is confirmed.',
      );
    } catch (reason) {
      setActionError(
        reason instanceof ApiError ? reason.message : 'Registration could not be completed.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!session?.token || !event || !registration) return;
    setBusy(true);
    setActionError('');
    setActionMessage('');
    try {
      await cancelEventRegistration(session.token, event._id, registration._id);
      setEvent((current) => (current ? { ...current, myRegistration: null } : current));
      setActionMessage('Your event registration was cancelled.');
    } catch (reason) {
      setActionError(
        reason instanceof ApiError
          ? reason.message
          : 'Registration cancellation could not be completed.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="events-loading" role="status">
        <Spinner size="md" label="Loading event" /> Loading event details…
      </div>
    );
  if (error || !event)
    return (
      <section className="events-error-state" role="alert">
        <p>{error || 'Event not found.'}</p>
        <Link to="/app/events">Back to events</Link>
      </section>
    );
  const image = getEventImage(event);
  const canRegister = Boolean(availability?.open && !hasActiveRegistration);
  const registrationLabel =
    registration?.status === 'waitlisted'
      ? `Waitlisted${registration.waitlistPosition ? ` · position ${registration.waitlistPosition}` : ''}`
      : registration?.status === 'attended'
        ? 'Attended'
        : registration?.status === 'registered'
          ? 'Registered'
          : '';

  return (
    <div className="event-details-page">
      <Link className="events-back-link" to="/app/events">
        <ArrowLeft size={15} /> All events
      </Link>
      <article className="event-detail-card">
        {image ? (
          <img className="event-detail-banner" src={image} alt={`${event.title} event banner`} />
        ) : (
          <div className="event-detail-banner event-card-image-fallback">
            <CalendarDays size={28} />
            <span>{event.category || 'Campus event'}</span>
          </div>
        )}
        <div className="event-detail-content">
          <div className="event-card-tags">
            <Badge variant={availability?.tone ?? 'neutral'} dot>
              {registration?.status ? registrationLabel : availability?.label}
            </Badge>
            {event.category && <Badge variant="outline">{event.category}</Badge>}
          </div>
          <h1>{event.title}</h1>
          <p className="event-detail-description">{event.description}</p>
          <div className="event-detail-facts">
            <div>
              <CalendarDays size={18} />
              <span>
                <strong>Date and time</strong>
                <small>
                  {formatEventDate(event.startDate, {
                    weekday: 'long',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}{' '}
                  – {formatEventDate(event.endDate, { hour: 'numeric', minute: '2-digit' })}
                </small>
              </span>
            </div>
            <div>
              <MapPin size={18} />
              <span>
                <strong>Venue</strong>
                <small>
                  {event.venue || (event.mode === 'online' ? 'Online' : 'Not specified')}
                  {event.mode && ` · ${event.mode.replace('_', ' ')}`}
                </small>
              </span>
            </div>
            <div>
              <UsersRound size={18} />
              <span>
                <strong>Organizer / coordinator</strong>
                <small>{getOrganizerLabel(event)}</small>
              </span>
            </div>
            <div>
              <Ticket size={18} />
              <span>
                <strong>Registration</strong>
                <small>
                  {event.registrationCloseDate
                    ? `Closes ${formatEventDate(event.registrationCloseDate, { hour: 'numeric', minute: '2-digit' })}`
                    : availability?.label}
                  {event.capacity
                    ? ` · ${Math.max(0, event.capacity - (event.allocatedSeats ?? 0))} seats remaining`
                    : ''}
                </small>
              </span>
            </div>
          </div>

          {event.eligibility && (
            <section className="event-detail-section">
              <h2>Eligibility</h2>
              <ul>
                {event.eligibility.targetRoles?.length ? (
                  <li>Roles: {event.eligibility.targetRoles.join(', ')}</li>
                ) : null}
                {event.eligibility.targetDepartments?.length ? (
                  <li>Departments: {event.eligibility.targetDepartments.join(', ')}</li>
                ) : null}
                {event.eligibility.targetBatches?.length ? (
                  <li>Batches: {event.eligibility.targetBatches.join(', ')}</li>
                ) : null}
                {event.eligibility.targetSemesters?.length ? (
                  <li>Semesters: {event.eligibility.targetSemesters.join(', ')}</li>
                ) : null}
                {event.eligibility.minCgpa !== undefined && (
                  <li>Minimum CGPA: {event.eligibility.minCgpa}</li>
                )}
                {event.eligibility.customCriteria && <li>{event.eligibility.customCriteria}</li>}
                {!event.eligibility.targetRoles?.length &&
                  !event.eligibility.targetDepartments?.length &&
                  !event.eligibility.targetBatches?.length &&
                  !event.eligibility.targetSemesters?.length &&
                  event.eligibility.minCgpa === undefined &&
                  !event.eligibility.customCriteria && (
                    <li>No additional eligibility criteria specified.</li>
                  )}
              </ul>
            </section>
          )}
          {event.rules && event.rules.length > 0 && (
            <section className="event-detail-section">
              <h2>Event information</h2>
              <ul>
                {event.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </section>
          )}
          {event.schedule?.length ? (
            <section className="event-detail-section">
              <h2>Schedule</h2>
              <ul className="event-schedule-list">
                {event.schedule.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    <Clock3 size={15} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {formatEventDate(item.startTime, { hour: 'numeric', minute: '2-digit' })} –{' '}
                        {formatEventDate(item.endTime, { hour: 'numeric', minute: '2-digit' })}
                        {item.venue ? ` · ${item.venue}` : ''}
                        {item.speaker ? ` · ${item.speaker}` : ''}
                      </small>
                      {item.description && <small>{item.description}</small>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {event.isTeamEvent && canRegister && (
            <section className="event-team-registration">
              <div>
                <h2>Team registration</h2>
                <p>
                  Add {minMembers === maxMembers ? `${minMembers}` : `${minMembers}–${maxMembers}`}{' '}
                  teammate{maxMembers === 1 ? '' : 's'} from your institution. You are included as
                  the team leader.
                </p>
              </div>
              <label>
                Team name (optional)
                <input value={teamName} onChange={(event) => setTeamName(event.target.value)} />
              </label>
              <label>
                Find teammates
                <Input
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Search by name or department"
                  leadingIcon={<Search size={15} />}
                />
              </label>
              {searchingMembers && <small>Searching institution members…</small>}
              {memberResults.length > 0 && (
                <ul className="event-team-results">
                  {memberResults.map((candidate) => (
                    <li key={candidate._id}>
                      <span>
                        <strong>{candidate.name}</strong>
                        <small>
                          {candidate.department || candidate.role || 'Institution member'}
                        </small>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={selectedMembers.length >= maxMembers}
                        onClick={() => {
                          setSelectedMembers((members) => [...members, candidate]);
                          setMemberSearch('');
                        }}
                      >
                        Add
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="event-team-selected">
                <strong>
                  Selected teammates ({selectedMembers.length}/{maxMembers})
                </strong>
                {selectedMembers.map((member) => (
                  <span key={member._id}>
                    {member.name}
                    <button
                      type="button"
                      aria-label={`Remove ${member.name}`}
                      onClick={() =>
                        setSelectedMembers((members) =>
                          members.filter((item) => item._id !== member._id),
                        )
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
                {!teamReady && (
                  <small role="status">
                    Select at least {minMembers} teammate{minMembers === 1 ? '' : 's'} to register.
                  </small>
                )}
              </div>
            </section>
          )}

          {(actionMessage || actionError) && (
            <p
              className={actionError ? 'event-action-error' : 'event-action-success'}
              role={actionError ? 'alert' : 'status'}
            >
              {actionError || actionMessage}
            </p>
          )}
          <div className="event-detail-actions">
            {canRegister && (
              <Button
                leadingIcon={
                  busy ? (
                    <Spinner size="sm" label="Submitting registration" />
                  ) : (
                    <Ticket size={16} />
                  )
                }
                disabled={busy || !teamReady}
                onClick={() => void handleRegister()}
              >
                {busy
                  ? 'Submitting…'
                  : availability?.label === 'Waitlist available'
                    ? 'Join waitlist'
                    : 'Register for event'}
              </Button>
            )}
            {hasActiveRegistration && registration?.status !== 'attended' && (
              <Button variant="outline" disabled={busy} onClick={() => void handleCancel()}>
                Cancel registration
              </Button>
            )}
            {registration && (
              <Badge variant={registration.status === 'waitlisted' ? 'warning' : 'success'}>
                <CheckCircle2 size={13} /> {registrationLabel}
              </Badge>
            )}
            {event.onlineMeetingUrl && (
              <a
                className="button button-secondary"
                href={event.onlineMeetingUrl}
                target="_blank"
                rel="noreferrer"
              >
                Meeting link <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
