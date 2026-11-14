import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, ConfirmationDialog, EmptyState, Spinner } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  cancelEventRegistration,
  getMyEventRegistrations,
  type CampusEvent,
  type EventRegistration,
} from '../../services/events/event-api';
import { EventCard } from './EventCard';
import './events.css';

interface MyRegistration {
  event: CampusEvent;
  registration: EventRegistration;
}

export function MyEventsPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<MyRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<MyRegistration | null>(null);
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      setItems(await getMyEventRegistrations(session.token));
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : 'Your registrations could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmCancel() {
    if (!session?.token || !cancelTarget) return;
    setCancelling(true);
    setCancelError('');
    try {
      await cancelEventRegistration(
        session.token,
        cancelTarget.event._id,
        cancelTarget.registration._id,
      );
      setItems((current) =>
        current.filter((item) => item.registration._id !== cancelTarget.registration._id),
      );
      setCancelTarget(null);
    } catch (reason) {
      setCancelError(
        reason instanceof ApiError ? reason.message : 'Registration could not be cancelled.',
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="events-page">
      <header className="events-page-heading">
        <div>
          <span className="eyebrow">CAMPUS LIFE</span>
          <h1>My registered events</h1>
          <p>Events where your account has an active registration.</p>
        </div>
        <nav aria-label="Event pages" className="events-page-nav">
          <Link to="/app/events">
            <CalendarDays size={16} /> Discover events
          </Link>
          <Link to="/app/calendar">
            <CalendarDays size={16} /> Calendar
          </Link>
        </nav>
      </header>
      {loading ? (
        <div className="events-loading" role="status">
          <Spinner size="md" label="Loading registrations" /> Loading your registrations…
        </div>
      ) : error ? (
        <div className="events-error-state" role="alert">
          <p>{error}</p>
          <Button onClick={() => void load()}>Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Ticket size={20} />}
          title="No registered events"
          description="When you register for a campus event, it will appear here."
          action={
            <Link className="button button-primary" to="/app/events">
              Discover events
            </Link>
          }
        />
      ) : (
        <>
          <p className="events-result-count">
            {items.length} active {items.length === 1 ? 'registration' : 'registrations'}. The
            backend has no dedicated registration-list route; this view checks the registration
            included in each event detail for up to 100 listed events.
          </p>
          <div className="events-grid">
            {items.map(({ event, registration }) => (
              <div className="my-event-item" key={registration._id}>
                <EventCard event={event} />
                <div className="my-event-registration">
                  <Badge
                    variant={
                      registration.status === 'waitlisted'
                        ? 'warning'
                        : registration.status === 'attended'
                          ? 'neutral'
                          : 'success'
                    }
                    dot
                  >
                    {registration.status === 'waitlisted'
                      ? `Waitlisted${registration.waitlistPosition ? ` · #${registration.waitlistPosition}` : ''}`
                      : registration.status}
                  </Badge>
                  {registration.ticketCode && <span>Ticket {registration.ticketCode}</span>}
                  {registration.status !== 'attended' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCancelError('');
                        setCancelTarget({ event, registration });
                      }}
                    >
                      Cancel registration
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {cancelError && !cancelTarget && (
        <p className="event-action-error" role="alert">
          {cancelError}
        </p>
      )}
      <ConfirmationDialog
        open={Boolean(cancelTarget)}
        onClose={() => {
          if (!cancelling) {
            setCancelTarget(null);
            setCancelError('');
          }
        }}
        onConfirm={() => void confirmCancel()}
        title="Cancel event registration?"
        description={
          <>
            {cancelError && <span role="alert">{cancelError} </span>}You’ll release your
            registration for <strong>{cancelTarget?.event.title}</strong>. The backend may promote
            the next person from the waitlist.
          </>
        }
        confirmLabel="Cancel registration"
        busy={cancelling}
      />
    </div>
  );
}
