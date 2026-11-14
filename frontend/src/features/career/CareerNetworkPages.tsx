import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Handshake, MessageCircle, UserCheck, UserMinus, UsersRound } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Input, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  createMentorshipRequest,
  getAlumni,
  getCareerConnections,
  openDirectConversation,
  getMentorshipRequests,
  removeCareerConnection,
  updateCareerConnection,
  updateMentorshipRequest,
  type CareerConnection,
  type CareerPerson,
  type MentorshipRequest,
} from '../../services/career/career-api';
import {
  CareerEmpty,
  CareerError,
  CareerHeading,
  CareerLoading,
  CareerNav,
} from './career-components';
import { careerPaths } from './career-paths';
import './career.css';

function statusBadge(status: string) {
  const variant =
    status === 'accepted'
      ? 'success'
      : status === 'pending'
        ? 'warning'
        : status === 'declined'
          ? 'critical'
          : 'neutral';
  return (
    <Badge variant={variant} size="sm">
      {status.replaceAll('_', ' ')}
    </Badge>
  );
}

export function CareerConnectionsPage() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CareerConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      setRows((await getCareerConnections(session.token)).connections);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connections could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.token]);
  useEffect(() => {
    void load();
  }, [load]);
  async function update(id: string, status: 'accepted' | 'declined') {
    if (!session?.token) return;
    setBusy(id);
    setError('');
    try {
      await updateCareerConnection(session.token, id, status);
      setNotice(`Connection request ${status}.`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connection request could not be updated.');
    } finally {
      setBusy('');
    }
  }
  async function remove(id: string) {
    if (!session?.token) return;
    setBusy(id);
    setError('');
    try {
      await removeCareerConnection(session.token, id);
      setNotice('Connection removed.');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Connection could not be removed.');
    } finally {
      setBusy('');
    }
  }
  async function messageConnection(row: CareerConnection) {
    if (!session?.token || !user?._id) return;
    const other =
      typeof row.requester === 'object' && row.requester._id === user._id
        ? row.recipient
        : row.requester;
    if (typeof other === 'string') return;
    setBusy(row._id);
    setError('');
    try {
      const result = await openDirectConversation(session.token, other._id);
      navigate(`/app/conversations/${result.conversation._id}`);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'The connection conversation could not be opened.',
      );
    } finally {
      setBusy('');
    }
  }
  const incoming = rows.filter(
    (r) =>
      r.status === 'pending' && typeof r.recipient !== 'string' && r.recipient._id === user?._id,
  );
  const outgoing = rows.filter(
    (r) =>
      r.status === 'pending' && typeof r.requester !== 'string' && r.requester._id === user?._id,
  );
  const accepted = rows.filter((r) => r.status === 'accepted');
  return (
    <div className="career-page">
      <CareerNav active="connections" />
      <CareerHeading
        title="Connections"
        description="Manage alumni connection requests and your accepted RNS professional connections."
        action={
          <Link to={careerPaths.alumni} className="button button-secondary">
            <UsersRound size={15} /> Find alumni
          </Link>
        }
      />
      {notice && (
        <p className="career-success" role="status">
          {notice}
        </p>
      )}
      {error && <CareerError message={error} retry={() => void load()} />}
      {loading ? (
        <CareerLoading />
      ) : (
        <div className="career-network-grid">
          <ConnectionSection
            title="Incoming requests"
            count={incoming.length}
            rows={incoming}
            currentId={user?._id}
            onAction={(row, action) => void update(row._id, action)}
            busy={busy}
            actions="incoming"
          />
          <ConnectionSection
            title="Sent requests"
            count={outgoing.length}
            rows={outgoing}
            currentId={user?._id}
            busy={busy}
            actions="outgoing"
            onAction={(row) => void remove(row._id)}
          />
          <ConnectionSection
            title="Accepted connections"
            count={accepted.length}
            rows={accepted}
            currentId={user?._id}
            busy={busy}
            actions="accepted"
            onAction={(row) => void remove(row._id)}
            onMessage={(row) => void messageConnection(row)}
          />
        </div>
      )}
    </div>
  );
}
function ConnectionSection({
  title,
  count,
  rows,
  currentId,
  busy,
  actions,
  onAction,
  onMessage,
}: {
  title: string;
  count: number;
  rows: CareerConnection[];
  currentId?: string;
  busy: string;
  actions: 'incoming' | 'outgoing' | 'accepted';
  onAction: (row: CareerConnection, action: 'accepted' | 'declined') => void;
  onMessage?: (row: CareerConnection) => void;
}) {
  return (
    <section className="career-panel">
      <div className="career-panel-head">
        <div>
          <span className="eyebrow">NETWORK</span>
          <h2>{title}</h2>
        </div>
        <Badge variant="outline">{count}</Badge>
      </div>
      {rows.length ? (
        <div className="career-network-list">
          {rows.map((row) => {
            const participant =
              typeof row.requester === 'object' && row.requester._id === currentId
                ? row.recipient
                : row.requester;
            const person = typeof participant === 'string' ? null : participant;
            return (
              <article className="career-network-row" key={row._id}>
                <Avatar name={person?.name || 'Alumni'} src={person?.avatar} size="sm" />
                <div className="career-network-main">
                  <strong>{person?.name || 'Network member'}</strong>
                  <small>{person?.headline || person?.role || 'RNS community'}</small>
                </div>
                {statusBadge(row.status)}
                {actions === 'incoming' ? (
                  <div className="career-row-actions">
                    <Button
                      size="sm"
                      loading={busy === row._id}
                      onClick={() => onAction(row, 'accepted')}
                      leadingIcon={<UserCheck size={14} />}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === row._id}
                      onClick={() => onAction(row, 'declined')}
                    >
                      Decline
                    </Button>
                  </div>
                ) : actions === 'accepted' ? (
                  <div className="career-row-actions">
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={busy === row._id}
                      onClick={() => onMessage?.(row)}
                      leadingIcon={<MessageCircle size={14} />}
                    >
                      Message
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === row._id}
                      onClick={() => onAction(row, 'declined')}
                      leadingIcon={<UserMinus size={14} />}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <span className="career-muted">Waiting for response</span>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <CareerEmpty
          title="No records here"
          description="Connection activity for this section will appear when available."
        />
      )}
    </section>
  );
}

export function CareerMentorshipPage() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mentorId = params.get('mentor') || '';
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [alumni, setAlumni] = useState<CareerPerson[]>([]);
  const [selected, setSelected] = useState(mentorId);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [responses, setResponses] = useState<Record<string, { note: string; message: string }>>({});
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      getMentorshipRequests(session.token),
      user?.role === 'student'
        ? getAlumni(session.token, { limit: 100 })
        : Promise.resolve({ alumni: [] as CareerPerson[] }),
    ]);
    if (results[0].status === 'fulfilled') setRequests(results[0].value.requests);
    else
      setError(
        results[0].reason instanceof ApiError
          ? results[0].reason.message
          : 'Mentorship requests could not be loaded.',
      );
    if (results[1].status === 'fulfilled') setAlumni(results[1].value.alumni);
    else
      setError(
        results[1].reason instanceof ApiError
          ? results[1].reason.message
          : 'Mentors could not be loaded.',
      );
    setLoading(false);
  }, [session?.token, user?.role]);
  useEffect(() => {
    void load();
  }, [load]);
  async function create(e: FormEvent) {
    e.preventDefault();
    if (!session?.token) return;
    setBusy('create');
    setError('');
    try {
      await createMentorshipRequest(session.token, {
        mentorId: selected,
        subject: subject.trim(),
        message: message.trim(),
        goals: goals
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setNotice('Mentorship request sent.');
      setSubject('');
      setMessage('');
      setGoals('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Mentorship request could not be sent.');
    } finally {
      setBusy('');
    }
  }
  async function update(id: string, status: 'accepted' | 'declined' | 'cancelled') {
    if (!session?.token) return;
    setBusy(id);
    setError('');
    try {
      const response = responses[id];
      await updateMentorshipRequest(session.token, id, {
        status,
        ...(user?.role === 'alumni' && response?.note ? { responseNote: response.note } : {}),
        ...(user?.role === 'alumni' && response?.message
          ? { responseMessage: response.message }
          : {}),
      });
      setResponses((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setNotice(`Mentorship request ${status}.`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Mentorship request could not be updated.');
    } finally {
      setBusy('');
    }
  }
  async function messageParticipant(participantId: string) {
    if (!session?.token) return;
    setBusy(participantId);
    setError('');
    try {
      const result = await openDirectConversation(session.token, participantId);
      navigate(`/app/conversations/${result.conversation._id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The mentor conversation could not be opened.');
    } finally {
      setBusy('');
    }
  }
  const mine =
    user?.role === 'student'
      ? requests.filter((r) => typeof r.student !== 'string' && r.student._id === user._id)
      : requests.filter((r) => typeof r.mentor !== 'string' && r.mentor._id === user?._id);
  return (
    <div className="career-page">
      <CareerNav active="mentorship" />
      <CareerHeading
        title="Mentorship"
        description="Connect students and RNS alumni through private, status-tracked mentorship requests."
      />
      {notice && (
        <p className="career-success" role="status">
          {notice}
        </p>
      )}
      {error && <CareerError message={error} retry={() => void load()} />}
      {user?.role === 'student' && (
        <Card className="career-ask-card">
          <div>
            <span className="eyebrow">REQUEST GUIDANCE</span>
            <h2>Ask an alumnus to mentor you</h2>
          </div>
          {loading ? (
            <CareerLoading />
          ) : alumni.length ? (
            <form onSubmit={create} className="career-mentor-form">
              <label>
                Alumni mentor
                <select value={selected} onChange={(e) => setSelected(e.target.value)} required>
                  <option value="">Choose an alumni mentor</option>
                  {alumni.map((person) => (
                    <option key={person._id} value={person._id}>
                      {person.name}
                      {person.alumniProfile?.company ? ` · ${person.alumniProfile.company}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What guidance are you seeking?"
                aria-label="Mentorship request subject"
                required
                maxLength={200}
              />
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself and explain what you hope to learn…"
                aria-label="Mentorship request message"
                rows={4}
                required
                maxLength={5000}
              />
              <Input
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="Goals, separated by commas (optional)"
                aria-label="Mentorship goals"
              />
              <Button
                type="submit"
                loading={busy === 'create'}
                leadingIcon={<Handshake size={15} />}
              >
                Send mentorship request
              </Button>
            </form>
          ) : (
            <CareerEmpty
              title="No alumni profiles available"
              description="Mentorship requests can be sent when alumni profiles are available."
            />
          )}
        </Card>
      )}
      <section className="career-panel">
        <div className="career-panel-head">
          <div>
            <span className="eyebrow">REQUESTS & RELATIONSHIPS</span>
            <h2>
              {user?.role === 'alumni' ? 'Requests from students' : 'Your mentorship requests'}
            </h2>
          </div>
        </div>
        {loading ? (
          <CareerLoading />
        ) : mine.length ? (
          <div className="career-mentorship-list">
            {mine.map((request) => {
              const other = user?.role === 'student' ? request.mentor : request.student;
              const person = typeof other === 'string' ? null : other;
              const otherParticipantId = person?._id;
              return (
                <article className="career-mentorship-card" key={request._id}>
                  <div className="career-network-row">
                    <Avatar name={person?.name || 'Mentor'} src={person?.avatar} size="md" />
                    <div className="career-network-main">
                      <strong>{request.subject}</strong>
                      <small>
                        {person?.name || 'Career community member'} ·{' '}
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ''}
                      </small>
                    </div>
                    {statusBadge(request.status)}
                  </div>
                  <p>{request.message}</p>
                  {request.goals && request.goals.length > 0 && (
                    <div className="career-skills">
                      {request.goals.map((goal) => (
                        <Badge key={goal} variant="outline" size="sm">
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {request.responseNote && (
                    <p className="career-response-note">Mentor note: {request.responseNote}</p>
                  )}
                  {request.responseMessage && (
                    <p className="career-response-note">
                      Mentor response: {request.responseMessage}
                    </p>
                  )}
                  {user?.role === 'alumni' && request.status === 'pending' && (
                    <div className="career-mentor-response">
                      <Input
                        value={responses[request._id]?.note || ''}
                        onChange={(event) =>
                          setResponses((current) => ({
                            ...current,
                            [request._id]: {
                              note: event.target.value,
                              message: current[request._id]?.message || '',
                            },
                          }))
                        }
                        placeholder="Optional response note"
                        aria-label="Mentorship response note"
                      />
                      <Textarea
                        value={responses[request._id]?.message || ''}
                        onChange={(event) =>
                          setResponses((current) => ({
                            ...current,
                            [request._id]: {
                              note: current[request._id]?.note || '',
                              message: event.target.value,
                            },
                          }))
                        }
                        placeholder="Optional message to the student"
                        aria-label="Mentorship response message"
                        rows={2}
                      />
                    </div>
                  )}
                  <div className="career-row-actions">
                    {user?.role === 'alumni' && request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          loading={busy === request._id}
                          onClick={() => void update(request._id, 'accepted')}
                          leadingIcon={<UserCheck size={14} />}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === request._id}
                          onClick={() => void update(request._id, 'declined')}
                        >
                          Decline
                        </Button>
                      </>
                    )}
                    {user?.role === 'student' && request.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busy === request._id}
                        onClick={() => void update(request._id, 'cancelled')}
                      >
                        Cancel request
                      </Button>
                    )}
                    {request.status === 'accepted' && otherParticipantId && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busy === otherParticipantId}
                        onClick={() => void messageParticipant(otherParticipantId)}
                        leadingIcon={<MessageCircle size={14} />}
                      >
                        Message {user?.role === 'alumni' ? 'student' : 'mentor'}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <CareerEmpty
            title="No mentorship activity"
            description="Requests and accepted mentorship relationships will appear here."
          />
        )}
      </section>
    </div>
  );
}
