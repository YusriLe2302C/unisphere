import { useState, type FormEvent } from 'react';
import { CalendarPlus, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import { createCampusEvent, submitCampusEvent } from '../../services/events/event-api';
import { FacultyError, FacultyHeading } from './faculty-components';
import './faculty.css';

export function FacultyEventCreatePage() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mode, setMode] = useState<'in_person' | 'online' | 'hybrid'>('in_person');
  const [venue, setVenue] = useState('');
  const [audience, setAudience] = useState<
    'all' | 'students' | 'faculty' | 'alumni' | 'institution_only'
  >('all');
  const [category, setCategory] = useState('');
  const [flyerUrl, setFlyerUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) return;
    setBusy(true);
    setError('');
    try {
      if (createdId) {
        await submitCampusEvent(session.token, createdId);
        navigate(`/app/events/${createdId}`);
        return;
      }
      const { event: created } = await createCampusEvent(session.token, {
        title: title.trim(),
        description: description.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        mode,
        venue: venue.trim() || undefined,
        audience,
        category: category.trim() || undefined,
        flyerUrl: flyerUrl.trim() || undefined,
      });
      setCreatedId(created._id);
      try {
        await submitCampusEvent(session.token, created._id);
        navigate(`/app/events/${created._id}`);
      } catch (submitError) {
        setError(
          submitError instanceof ApiError
            ? submitError.message
            : 'Event saved as a draft, but submission failed.',
        );
      }
    } catch (createError) {
      setError(
        createError instanceof ApiError ? createError.message : 'Event could not be created.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="faculty-page">
      <FacultyHeading
        title="Propose a campus event"
        description="Create an event draft and submit it through the institution's existing review workflow."
      />
      <Card className="faculty-form-card faculty-event-form-card">
        {user?.role !== 'faculty' && (
          <p className="faculty-permission-note">
            The event API checks your account permissions and institution. Any authorization or
            validation response is shown here.
          </p>
        )}
        <form className="faculty-announcement-form" onSubmit={submit}>
          <label>
            Event title
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label>
            Description
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={6}
            />
          </label>
          <div className="faculty-form-row">
            <label>
              Start date and time
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </label>
            <label>
              End date and time
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </label>
          </div>
          <div className="faculty-form-row">
            <label>
              Event mode
              <Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
                <option value="in_person">In person</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </label>
            <label>
              Audience
              <Select
                value={audience}
                onChange={(event) => setAudience(event.target.value as typeof audience)}
              >
                <option value="all">All</option>
                <option value="students">Students</option>
                <option value="faculty">Faculty</option>
                <option value="alumni">Alumni</option>
                <option value="institution_only">Institution only</option>
              </Select>
            </label>
          </div>
          {mode !== 'online' && (
            <label>
              Venue
              <Input value={venue} onChange={(event) => setVenue(event.target.value)} />
            </label>
          )}
          <div className="faculty-form-row">
            <label>
              Category (optional)
              <Input value={category} onChange={(event) => setCategory(event.target.value)} />
            </label>
            <label>
              Flyer URL
              <Input
                type="url"
                value={flyerUrl}
                onChange={(event) => setFlyerUrl(event.target.value)}
                placeholder="https://…"
              />
              <small>A flyer is required by the event submission endpoint.</small>
            </label>
          </div>
          {error && <FacultyError message={error} />}
          {createdId && (
            <p className="faculty-success" role="status">
              Event draft was created.{' '}
              <Link to={`/app/events/${createdId}`}>Open event details</Link> to continue.
            </p>
          )}
          <Button
            type="submit"
            loading={busy}
            leadingIcon={createdId ? <Send size={16} /> : <CalendarPlus size={16} />}
          >
            {createdId ? 'Retry submission' : 'Create and submit for review'}
          </Button>
          <small>
            The backend creates this event as a draft and validates its flyer, permissions, and
            lifecycle state when submitted.
          </small>
        </form>
      </Card>
    </div>
  );
}
