import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Check, Download, Eye, Pencil, Search, Send, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Input, Select, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  cancelCampusEvent,
  getEventRegistrations,
  getEvents,
  publishCampusEvent,
  reviewCampusEvent,
  submitCampusEvent,
  updateCampusEvent,
  type CampusEvent,
  type EventLifecycleStatus,
  type EventParticipant,
} from '../../services/events/event-api';
import {
  FacultyEmpty,
  FacultyError,
  FacultyHeading,
  FacultyLoading,
  FacultyStatus,
} from '../faculty/faculty-components';
import '../faculty/faculty.css';

const statusOptions: EventLifecycleStatus[] = [
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'published',
  'ongoing',
  'completed',
  'cancelled',
];
export function AdministrationEventsPage() {
  const { session, user } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState('');
  const [participants, setParticipants] = useState<Record<string, EventParticipant[]>>({});
  const [editing, setEditing] = useState('');
  const [editDraft, setEditDraft] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    venue: '',
    flyerUrl: '',
  });
  const canReview = ['admin', 'superadmin', 'dean', 'principal'].includes(user?.role || '');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      setEvents(
        await getEvents(session.token, {
          limit: 100,
          status: (status || undefined) as EventLifecycleStatus | undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Events could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.token, status]);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = useMemo(
    () =>
      events.filter((event) =>
        `${event.title} ${event.description} ${event.category || ''} ${event.venue || ''}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [events, search],
  );
  async function perform(
    id: string,
    action: () => Promise<{ event: CampusEvent }>,
    message: string,
  ) {
    if (!session?.token) return;
    setBusy(id);
    setError('');
    setNotice('');
    try {
      const result = await action();
      setEvents((rows) => rows.map((row) => (row._id === id ? result.event : row)));
      setNotice(message);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Event action was rejected by the existing event workflow.',
      );
    } finally {
      setBusy('');
    }
  }
  async function showRegistrations(event: CampusEvent) {
    if (!session?.token) return;
    setExpanded(event._id);
    setBusy(event._id);
    setError('');
    try {
      const result = await getEventRegistrations(session.token, event._id);
      setParticipants((current) => ({ ...current, [event._id]: result.registrations }));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Registration list could not be loaded. The event API validates management access.',
      );
    } finally {
      setBusy('');
    }
  }
  function beginEdit(event: CampusEvent) {
    setEditing(event._id);
    setEditDraft({
      title: event.title,
      description: event.description,
      startDate: new Date(event.startDate).toISOString().slice(0, 16),
      endDate: new Date(event.endDate).toISOString().slice(0, 16),
      venue: event.venue || '',
      flyerUrl: event.flyerUrl || '',
    });
  }
  async function saveEdit(event: CampusEvent, form: FormEvent) {
    form.preventDefault();
    if (!session?.token) return;
    await perform(
      event._id,
      () =>
        updateCampusEvent(session.token, event._id, {
          title: editDraft.title,
          description: editDraft.description,
          startDate: new Date(editDraft.startDate).toISOString(),
          endDate: new Date(editDraft.endDate).toISOString(),
          venue: editDraft.venue || undefined,
          flyerUrl: editDraft.flyerUrl || undefined,
        }),
      'Event details updated.',
    );
    setEditing('');
  }
  const isManager = ['admin', 'superadmin', 'dean', 'principal'].includes(user?.role || '');
  return (
    <div className="faculty-page">
      <FacultyHeading
        title="Institution events"
        description="Review event records, manage supported lifecycle actions, and inspect registrations."
        action={
          isManager ? (
            <Link className="button button-primary" to="/app/events/create">
              <CalendarDays size={15} /> Create event
            </Link>
          ) : undefined
        }
      />
      {notice && (
        <p className="faculty-success" role="status">
          {notice}
        </p>
      )}
      {error && <FacultyError message={error} retry={() => void load()} />}
      <section className="faculty-panel">
        <header className="faculty-panel-head">
          <div>
            <span className="eyebrow">EVENT WORKFLOW</span>
            <h2>
              Events <Badge variant="outline">{filtered.length} loaded</Badge>
            </h2>
          </div>
        </header>
        <div className="admin-user-filters">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search loaded events"
            aria-label="Search events"
            leadingIcon={<Search size={15} />}
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter events by lifecycle"
          >
            <option value="">Published and current events</option>
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll('_', ' ')}
              </option>
            ))}
          </Select>
        </div>
        {loading ? (
          <FacultyLoading />
        ) : filtered.length ? (
          <div className="admin-event-list">
            {filtered.map((event) => (
              <article className="admin-event-card" key={event._id}>
                <div className="admin-event-main">
                  <div className="admin-event-title">
                    <div>
                      <h3>{event.title}</h3>
                      <small>
                        {new Date(event.startDate).toLocaleString()} ·{' '}
                        {event.venue || event.mode || 'Venue not listed'} ·{' '}
                        {event.category || 'Uncategorized'}
                      </small>
                    </div>
                    <FacultyStatus status={event.status} />
                  </div>
                  {event.description && <p>{event.description}</p>}
                  {event.status === 'rejected' && (
                    <p className="admin-event-note">
                      Review status: rejected. The event owner can revise and resubmit using the
                      existing workflow.
                    </p>
                  )}
                  {editing === event._id ? (
                    <form
                      className="admin-event-edit"
                      onSubmit={(form) => void saveEdit(event, form)}
                    >
                      <label>
                        Title
                        <Input
                          value={editDraft.title}
                          onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                          required
                        />
                      </label>
                      <label>
                        Description
                        <Textarea
                          value={editDraft.description}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, description: e.target.value })
                          }
                          rows={4}
                          required
                        />
                      </label>
                      <div className="faculty-form-row">
                        <label>
                          Start
                          <Input
                            type="datetime-local"
                            value={editDraft.startDate}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, startDate: e.target.value })
                            }
                            required
                          />
                        </label>
                        <label>
                          End
                          <Input
                            type="datetime-local"
                            value={editDraft.endDate}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, endDate: e.target.value })
                            }
                            required
                          />
                        </label>
                      </div>
                      <div className="faculty-form-row">
                        <label>
                          Venue
                          <Input
                            value={editDraft.venue}
                            onChange={(e) => setEditDraft({ ...editDraft, venue: e.target.value })}
                          />
                        </label>
                        <label>
                          Flyer URL
                          <Input
                            type="url"
                            value={editDraft.flyerUrl}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, flyerUrl: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <div className="admin-row-actions">
                        <Button
                          type="submit"
                          size="sm"
                          loading={busy === event._id}
                          leadingIcon={<Check size={14} />}
                        >
                          Save edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing('')}
                          leadingIcon={<X size={14} />}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : null}
                  <div className="admin-row-actions admin-event-actions">
                    <Link
                      className="button button-secondary button-sm"
                      to={`/app/events/${event._id}`}
                    >
                      <Eye size={14} /> Details
                    </Link>
                    {['draft', 'rejected', 'pending_review', 'approved'].includes(event.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Boolean(busy)}
                        onClick={() => beginEdit(event)}
                        leadingIcon={<Pencil size={14} />}
                      >
                        Edit
                      </Button>
                    )}
                    {['draft', 'rejected'].includes(event.status) && (
                      <Button
                        size="sm"
                        loading={busy === event._id}
                        onClick={() =>
                          void perform(
                            event._id,
                            () => submitCampusEvent(session!.token, event._id),
                            'Event submitted for review.',
                          )
                        }
                        leadingIcon={<Send size={14} />}
                      >
                        Submit
                      </Button>
                    )}
                    {event.status === 'pending_review' && canReview && (
                      <>
                        <Button
                          size="sm"
                          loading={busy === event._id}
                          onClick={() =>
                            void perform(
                              event._id,
                              () => reviewCampusEvent(session!.token, event._id, 'approve'),
                              'Event approved.',
                            )
                          }
                          leadingIcon={<Check size={14} />}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(busy)}
                          onClick={() => {
                            const reason = window.prompt('Reason for rejecting this event:');
                            if (reason?.trim())
                              void perform(
                                event._id,
                                () =>
                                  reviewCampusEvent(session!.token, event._id, 'reject', reason),
                                'Event rejected.',
                              );
                          }}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {event.status === 'approved' && (
                      <Button
                        size="sm"
                        loading={busy === event._id}
                        onClick={() =>
                          void perform(
                            event._id,
                            () => publishCampusEvent(session!.token, event._id),
                            'Event published.',
                          )
                        }
                        leadingIcon={<Send size={14} />}
                      >
                        Publish
                      </Button>
                    )}
                    {!['completed', 'cancelled'].includes(event.status) && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={Boolean(busy)}
                        onClick={() => {
                          const reason = window.prompt('Cancellation reason (optional):');
                          if (reason !== null)
                            void perform(
                              event._id,
                              () => cancelCampusEvent(session!.token, event._id, reason),
                              'Event cancelled.',
                            );
                        }}
                      >
                        Cancel event
                      </Button>
                    )}
                    {event.status === 'published' ||
                    event.status === 'ongoing' ||
                    event.status === 'completed' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busy === event._id}
                        onClick={() => void showRegistrations(event)}
                      >
                        Registrations
                      </Button>
                    ) : null}
                  </div>
                  {expanded === event._id && (
                    <section className="admin-registration-panel">
                      <header>
                        <strong>Event registrations</strong>
                        <Button variant="ghost" size="sm" onClick={() => setExpanded('')}>
                          Close
                        </Button>
                      </header>
                      {busy === event._id ? (
                        <FacultyLoading />
                      ) : participants[event._id]?.length ? (
                        <div className="faculty-table-wrap">
                          <table className="faculty-table">
                            <thead>
                              <tr>
                                <th>Participant</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th>Registered</th>
                              </tr>
                            </thead>
                            <tbody>
                              {participants[event._id]?.map((row) => {
                                const person =
                                  typeof row.userId === 'string' ? undefined : row.userId;
                                return (
                                  <tr key={row._id}>
                                    <td>
                                      {person?.name || 'Participant'}
                                      <small>{person?.email}</small>
                                    </td>
                                    <td>{person?.department || '—'}</td>
                                    <td>
                                      <Badge
                                        variant={row.status === 'attended' ? 'success' : 'outline'}
                                      >
                                        {row.status}
                                      </Badge>
                                    </td>
                                    <td>
                                      {row.registeredAt
                                        ? new Date(row.registeredAt).toLocaleString()
                                        : '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p>No active registrations were returned for this event.</p>
                      )}
                    </section>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <FacultyEmpty
            title="No events in this view"
            description="The event list endpoint returns published/current records by default. Select a lifecycle status to load matching managed events."
          />
        )}
      </section>
      <p className="faculty-data-note">
        <Download size={14} />
        The event service validates each action, lifecycle state, and management permission. Event
        listing and registration details are limited to records returned by those APIs.
      </p>
    </div>
  );
}
