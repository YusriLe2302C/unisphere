import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Modal, Spinner } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getAcademicCalendars,
  type AcademicCalendarEvent,
} from '../../services/academics/academic-api';
import { getEvents, type CampusEvent } from '../../services/events/event-api';
import { formatEventDate, getEventImage } from './event-format';
import './events.css';

type CalendarItem =
  | {
      id: string;
      source: 'campus';
      title: string;
      description: string;
      startDate: string;
      endDate: string;
      event: CampusEvent;
    }
  | {
      id: string;
      source: 'academic';
      title: string;
      description: string;
      startDate: string;
      endDate: string;
      event: AcademicCalendarEvent;
      academicYear: string;
      semesterType: string;
    };

function startOfGrid(month: Date): Date {
  const date = new Date(month.getFullYear(), month.getMonth(), 1);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function endOfGrid(month: Date): Date {
  const date = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  date.setDate(date.getDate() + (6 - date.getDay()));
  return date;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayKey(value: string): string {
  return dateKey(new Date(value));
}

export function EventsCalendarPage() {
  const { session, user } = useAuth();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [campusEvents, setCampusEvents] = useState<CampusEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CalendarItem | null>(null);
  const range = useMemo(() => {
    const from = startOfGrid(month);
    const to = endOfGrid(month);
    return {
      from: from.toISOString(),
      to: new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).toISOString(),
    };
  }, [month]);

  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    setCampusEvents([]);
    setCalendarEvents([]);
    const [eventsResult, academicResult] = await Promise.allSettled([
      getEvents(session.token, { from: range.from, to: range.to, limit: 100 }),
      getAcademicCalendars(session.token, undefined, range),
    ]);
    const errors: string[] = [];
    if (eventsResult.status === 'fulfilled')
      setCampusEvents(
        eventsResult.value.filter((event) =>
          ['published', 'ongoing', 'completed'].includes(event.status),
        ),
      );
    else
      errors.push(
        eventsResult.reason instanceof ApiError
          ? eventsResult.reason.message
          : 'Campus events are unavailable.',
      );
    if (academicResult.status === 'fulfilled') {
      setCalendarEvents(
        academicResult.value.flatMap((calendar) =>
          calendar.events
            .filter(
              (event) =>
                (!event.targetDepartments?.length ||
                  event.targetDepartments.includes(user?.department ?? '')) &&
                (!event.targetBatches?.length || event.targetBatches.includes(user?.batch ?? '')),
            )
            .map((event) => ({
              id: event._id ?? `${calendar._id}-${event.title}-${event.startDate}`,
              source: 'academic' as const,
              title: event.title,
              description: event.description ?? '',
              startDate: event.startDate,
              endDate: event.endDate,
              event,
              academicYear: calendar.academicYear,
              semesterType: calendar.semesterType,
            })),
        ),
      );
    } else
      errors.push(
        academicResult.reason instanceof ApiError
          ? academicResult.reason.message
          : 'Academic calendar events are unavailable.',
      );
    setError(errors.join(' '));
    setLoading(false);
  }, [session?.token, range, user?.department, user?.batch]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<CalendarItem[]>(
    () =>
      [
        ...campusEvents.map((event) => ({
          id: event._id,
          source: 'campus' as const,
          title: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          event,
        })),
        ...calendarEvents,
      ].sort(
        (left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime(),
      ),
    [campusEvents, calendarEvents],
  );
  const monthDays = useMemo(() => {
    const days: Date[] = [];
    const cursor = startOfGrid(month);
    const last = endOfGrid(month);
    while (cursor <= last) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [month]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const cursor = new Date(item.startDate);
      const end = new Date(item.endDate);
      while (cursor <= end) {
        const key = dayKey(cursor.toISOString());
        const values = map.get(key) ?? [];
        if (!values.some((existing) => existing.id === item.id)) values.push(item);
        map.set(key, values);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [items]);

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const today = dateKey(new Date());
  const selectedCampus = selected?.source === 'campus' ? selected.event : null;

  return (
    <div className="events-page calendar-page">
      <header className="events-page-heading">
        <div>
          <span className="eyebrow">CAMPUS LIFE</span>
          <h1>Calendar of events</h1>
          <p>Academic dates and institutional events in one view.</p>
        </div>
        <nav aria-label="Event pages" className="events-page-nav">
          <Link to="/app/events">
            <ArrowLeft size={16} /> Discover events
          </Link>
          <Link to="/app/events/mine">
            <CalendarDays size={16} /> My registrations
          </Link>
        </nav>
      </header>
      <section className="calendar-panel">
        <div className="calendar-controls">
          <div>
            <h2>{monthLabel}</h2>
            <span>
              {items.length} listed {items.length === 1 ? 'event' : 'events'}
            </span>
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            >
              Today
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label="Previous month"
              onClick={() =>
                setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
              }
            >
              <ArrowLeft size={15} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-label="Next month"
              onClick={() =>
                setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
              }
            >
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="events-loading" role="status">
            <Spinner size="md" label="Loading calendar" /> Loading calendar…
          </div>
        ) : (
          <>
            {error && (
              <div className="events-calendar-error" role="alert">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  leadingIcon={<RefreshCw size={14} />}
                  onClick={() => void load()}
                >
                  Retry
                </Button>
              </div>
            )}
            <div className="calendar-month-grid" aria-label={`${monthLabel} calendar`}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div className="calendar-weekday" key={day}>
                  {day}
                </div>
              ))}
              {monthDays.map((date) => {
                const key = dateKey(date);
                const dayItems = eventsByDay.get(key) ?? [];
                const inMonth = date.getMonth() === month.getMonth();
                return (
                  <div
                    className={`calendar-day ${inMonth ? '' : 'is-outside'} ${key === today ? 'is-today' : ''}`}
                    key={key}
                  >
                    <span className="calendar-day-number" aria-label={date.toLocaleDateString()}>
                      {date.getDate()}
                    </span>
                    <div className="calendar-day-events">
                      {dayItems.slice(0, 3).map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={`calendar-event-chip ${item.source}`}
                          onClick={() => setSelected(item)}
                          title={item.title}
                        >
                          <i />
                          {item.title}
                        </button>
                      ))}
                      {dayItems.length > 3 && (
                        <span className="calendar-more">+{dayItems.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <section className="calendar-mobile-list" aria-label={`Events in ${monthLabel}`}>
              <h3>Events this month</h3>
              {items.length === 0 ? (
                <p>No events are listed for this month.</p>
              ) : (
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => setSelected(item)}>
                        <time dateTime={item.startDate}>
                          {formatEventDate(item.startDate, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                        <span>
                          <strong>{item.title}</strong>
                          <small>
                            {item.source === 'academic'
                              ? `Academic · ${item.event.type}`
                              : item.event.venue || 'Campus event'}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </section>
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? 'Calendar event'}
        description={
          selected?.source === 'academic'
            ? `Academic calendar · ${selected.academicYear} · ${selected.semesterType}`
            : selectedCampus?.category || 'Campus event'
        }
      >
        {selected && (
          <div className="calendar-event-detail">
            {selectedCampus && getEventImage(selectedCampus) && (
              <img src={getEventImage(selectedCampus)} alt="" />
            )}
            {selected.description && <p>{selected.description}</p>}
            <div>
              <CalendarDays size={16} />
              <span>
                {formatEventDate(selected.startDate, {
                  weekday: 'long',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {selected.startDate !== selected.endDate
                  ? ` – ${formatEventDate(selected.endDate, { hour: 'numeric', minute: '2-digit' })}`
                  : ''}
              </span>
            </div>
            {selectedCampus?.venue && (
              <div>
                <MapPin size={16} />
                <span>{selectedCampus.venue}</span>
              </div>
            )}
            {selected.source === 'academic' && (
              <Badge variant="brand">{selected.event.type.replaceAll('_', ' ')}</Badge>
            )}
            {selectedCampus && (
              <Link
                className="button button-primary"
                to={`/app/events/${encodeURIComponent(selectedCampus._id)}`}
                onClick={() => setSelected(null)}
              >
                View event details <ArrowRight size={15} />
              </Link>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
