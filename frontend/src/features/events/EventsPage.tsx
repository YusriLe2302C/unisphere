import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, Search, Ticket, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, Input, Spinner } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import { getEvents, type CampusEvent } from '../../services/events/event-api';
import { getRegistrationAvailability } from './event-format';
import { EventCard } from './EventCard';
import './events.css';

const pageSize = 9;

export function EventsPage() {
  const { session, user } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [registration, setRegistration] = useState('all');
  const [sort, setSort] = useState('date-asc');
  const [page, setPage] = useState(1);

  const loadEvents = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      const upcoming = await getEvents(session.token, {
        from: new Date().toISOString(),
        limit: 100,
      });
      const visibleStatuses =
        user?.role === 'faculty'
          ? ['draft', 'pending_review', 'approved', 'rejected', 'published', 'ongoing', 'completed', 'cancelled']
          : ['published', 'ongoing', 'completed'];
      setEvents(upcoming.filter((event) => visibleStatuses.includes(event.status)));
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'Events could not be loaded. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token, user?.role]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const categories = useMemo(
    () =>
      [
        ...new Set(
          events.map((event) => event.category).filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [events],
  );
  const filteredEvents = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return events
      .filter((event) => {
        const matchesSearch =
          !needle ||
          [
            event.title,
            event.description,
            event.category,
            event.venue,
            ...(event.coordinators ?? []).map((coordinator) => coordinator.name),
            ...(event.tags ?? []),
          ].some((value) => value?.toLocaleLowerCase().includes(needle));
        const matchesCategory = category === 'all' || event.category === category;
        const state = getRegistrationAvailability(event).open ? 'open' : 'closed';
        return (
          matchesSearch && matchesCategory && (registration === 'all' || registration === state)
        );
      })
      .sort((left, right) => {
        if (sort === 'date-desc')
          return new Date(right.startDate).getTime() - new Date(left.startDate).getTime();
        if (sort === 'title') return left.title.localeCompare(right.title);
        return new Date(left.startDate).getTime() - new Date(right.startDate).getTime();
      });
  }, [events, search, category, registration, sort]);
  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, category, registration, sort]);

  return (
    <div className="events-page">
      <header className="events-page-heading">
        <div>
          <span className="eyebrow">CAMPUS LIFE</span>
          <h1>Events</h1>
          <p>Discover what’s happening across your institution.</p>
        </div>
        <nav aria-label="Event pages" className="events-page-nav">
          <Link to="/app/events/mine">
            <Ticket size={16} /> My registered events
          </Link>
          <Link to="/app/calendar">
            <CalendarRange size={16} /> Calendar
          </Link>
        </nav>
      </header>
      <section className="events-toolbar" aria-label="Filter events">
        <label className="events-search-label">
          <span className="us-sr-only">Search events</span>
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events, venue, category…"
            leadingIcon={<Search size={16} />}
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Registration
          <select value={registration} onChange={(event) => setRegistration(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed / full</option>
          </select>
        </label>
        <label>
          Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="date-asc">Date: soonest</option>
            <option value="date-desc">Date: latest</option>
            <option value="title">Title: A–Z</option>
          </select>
        </label>
      </section>
      {loading ? (
        <div className="events-loading" role="status">
          <Spinner size="md" label="Loading events" /> Loading campus events…
        </div>
      ) : error ? (
        <div className="events-error-state" role="alert">
          <p>{error}</p>
          <Button onClick={() => void loadEvents()}>Try again</Button>
        </div>
      ) : visibleEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={20} />}
          title="No matching events"
          description={
            events.length
              ? 'Try changing the search or filters.'
              : user?.role === 'faculty'
                ? 'No upcoming events are available in your institution right now.'
                : 'No upcoming published events are available right now.'
          }
          action={
            search || category !== 'all' || registration !== 'all' ? (
              <Button
                variant="outline"
                leadingIcon={<X size={15} />}
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                  setRegistration('all');
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="events-result-count">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} · Upcoming
            events from your institution
          </p>
          <div className="events-grid">
            {visibleEvents.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
          {pageCount > 1 && (
            <nav className="events-pagination" aria-label="Event pages">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
