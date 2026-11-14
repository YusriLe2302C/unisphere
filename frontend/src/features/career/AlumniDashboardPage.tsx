import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  Handshake,
  MessageCircle,
  MessageCircleQuestion,
  MessagesSquare,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, Badge, Card } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getCareerConnections,
  getCareerOpportunities,
  getCareerQuestions,
  getConversations,
  getMentorshipRequests,
  type CareerConnection,
  type CareerConversation,
  type CareerOpportunity,
  type CareerQuestion,
  type MentorshipRequest,
} from '../../services/career/career-api';
import {
  CareerEmpty,
  CareerError,
  CareerHeading,
  CareerLoading,
  CareerNav,
} from './career-components';
import { formatCareerDeadline } from './career-format';
import { careerPaths } from './career-paths';
import './career.css';

function participantName(
  value: CareerConversation['participants'][number] | string | undefined,
  currentId?: string,
) {
  if (!value || typeof value === 'string') return '';
  return value._id === currentId ? '' : value.name;
}

export function AlumniDashboardPage() {
  const { session, user } = useAuth();
  const [questions, setQuestions] = useState<CareerQuestion[]>([]);
  const [connections, setConnections] = useState<CareerConnection[]>([]);
  const [mentorship, setMentorship] = useState<MentorshipRequest[]>([]);
  const [conversations, setConversations] = useState<CareerConversation[]>([]);
  const [opportunities, setOpportunities] = useState<CareerOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      getCareerQuestions(session.token),
      getCareerConnections(session.token),
      getMentorshipRequests(session.token),
      getConversations(session.token),
      getCareerOpportunities(user?.institution || ''),
    ]);
    const errors: string[] = [];
    if (results[0].status === 'fulfilled')
      // The API returns only public questions and private threads this user can access.
      setQuestions(results[0].value.questions);
    else
      errors.push(
        results[0].reason instanceof ApiError
          ? results[0].reason.message
          : 'Career questions could not be loaded.',
      );
    if (results[1].status === 'fulfilled') setConnections(results[1].value.connections);
    else
      errors.push(
        results[1].reason instanceof ApiError
          ? results[1].reason.message
          : 'Connection activity could not be loaded.',
      );
    if (results[2].status === 'fulfilled') setMentorship(results[2].value.requests);
    else
      errors.push(
        results[2].reason instanceof ApiError
          ? results[2].reason.message
          : 'Mentorship activity could not be loaded.',
      );
    if (results[3].status === 'fulfilled') setConversations(results[3].value.conversations);
    else
      errors.push(
        results[3].reason instanceof ApiError
          ? results[3].reason.message
          : 'Conversations could not be loaded.',
      );
    if (results[4].status === 'fulfilled')
      setOpportunities(results[4].value.opportunities.slice(0, 3));
    else
      errors.push(
        results[4].reason instanceof ApiError
          ? results[4].reason.message
          : 'Opportunities could not be loaded.',
      );
    setError(errors.join(' '));
    setLoading(false);
  }, [session?.token, user?.institution]);
  useEffect(() => {
    void load();
  }, [load]);

  const incoming = connections.filter(
    (row) =>
      row.status === 'pending' &&
      typeof row.recipient !== 'string' &&
      row.recipient._id === user?._id,
  );
  const accepted = connections.filter((row) => row.status === 'accepted');
  const activeMentorship = mentorship.filter((row) => row.status === 'accepted');
  const pendingMentorship = mentorship.filter((row) => row.status === 'pending');
  const recentQuestions = [...questions]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 4);
  const recentConversations = conversations.slice(0, 4);
  const previousAnswers = questions
    .flatMap((question) => question.answers.map((answer) => ({ question, answer })))
    .filter(({ answer }) => {
      const responderId =
        typeof answer.responder === 'string' ? answer.responder : answer.responder._id;
      return responderId === user?._id;
    })
    .sort((a, b) => Date.parse(b.answer.createdAt || '') - Date.parse(a.answer.createdAt || ''))
    .slice(0, 3);
  const profile = user?.alumniProfile;

  return (
    <div className="career-page alumni-dashboard">
      <CareerNav active="home" />
      <CareerHeading
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description={`${user?.institution ? `Your ${user.institution} professional network,` : 'Your professional network,'} student guidance, and mentorship activity.`}
        action={
          <Link to="/app/profile" className="button button-primary">
            <UserRound size={16} /> Update profile
          </Link>
        }
      />
      <Card className="alumni-profile-banner">
        <Avatar name={user?.name || 'Alumni'} src={user?.avatar} size="xl" />
        <div className="alumni-profile-main">
          <span className="eyebrow">ALUMNI PROFILE</span>
          <h2>{user?.name}</h2>
          <p>
            {profile?.designation || user?.headline || 'Professional profile'}
            {profile?.company ? ` · ${profile.company}` : ''}
          </p>
          <small>
            {[user?.department, user?.graduationYear ? `Class of ${user.graduationYear}` : '']
              .filter(Boolean)
              .join(' · ') || user?.institution}
          </small>
          <div className="alumni-profile-facts">
            {profile?.industry && (
              <Badge variant="brand" size="sm">
                {profile.industry}
              </Badge>
            )}
            {profile?.yearsExperience !== undefined && (
              <span>{profile.yearsExperience} years experience</span>
            )}
          </div>
          {user?.skills?.length ? (
            <div className="career-skills">
              {user.skills.slice(0, 5).map((skill) => (
                <Badge key={skill} variant="outline" size="sm">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        <Link to="/app/profile" className="alumni-profile-link">
          Edit career profile <ArrowRight size={15} />
        </Link>
      </Card>
      {error && <CareerError message={error} retry={() => void load()} />}
      <section className="career-metrics alumni-metrics">
        <AlumniMetric
          label="Student questions"
          value={loading ? '—' : questions.length}
          to={careerPaths.questions}
          icon={<MessageCircleQuestion />}
        />
        <AlumniMetric
          label="Pending mentorship requests"
          value={loading ? '—' : pendingMentorship.length}
          to={careerPaths.mentorship}
          icon={<Handshake />}
        />
        <AlumniMetric
          label="Active mentorships"
          value={loading ? '—' : activeMentorship.length}
          to={careerPaths.mentorship}
          icon={<UsersRound />}
        />
        <AlumniMetric
          label="Connections"
          value={loading ? '—' : accepted.length}
          to={careerPaths.connections}
          icon={<UserRound />}
        />
      </section>
      {opportunities.length > 0 && (
        <section className="career-panel">
          <div className="career-panel-head">
            <div>
              <span className="eyebrow">INSTITUTION OPPORTUNITIES</span>
              <h2>Career opportunities</h2>
            </div>
            <BriefcaseBusiness size={19} />
          </div>
          <div className="career-opportunity-list">
            {opportunities.map((item) => (
              <article key={item._id}>
                <div>
                  <Badge variant="brand" size="sm">
                    {item.type}
                  </Badge>
                  <h3>{item.title}</h3>
                  <p>
                    {item.organization}
                    {item.location ? ` · ${item.location}` : ''}
                  </p>
                  <small>{formatCareerDeadline(item.deadline)}</small>
                </div>
                {item.applyUrl && (
                  <a
                    className="button button-secondary button-sm"
                    href={item.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View opportunity <ArrowRight size={14} />
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="career-dashboard-grid alumni-dashboard-grid">
        <section className="career-panel">
          <div className="career-panel-head">
            <div>
              <span className="eyebrow">STUDENT CAREER GUIDANCE</span>
              <h2>Questions to answer</h2>
            </div>
            <Link to={careerPaths.questions}>
              Browse all <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <CareerLoading />
          ) : recentQuestions.length ? (
            <div className="career-question-list">
              {recentQuestions.map((question) => (
                <Link
                  key={question._id}
                  to={`${careerPaths.questions}/${question._id}`}
                  className="career-question-row"
                >
                  <div>
                    <h3>{question.title}</h3>
                    <p>{question.body}</p>
                    <small>
                      {question.answers.length}{' '}
                      {question.answers.length === 1 ? 'answer' : 'answers'} ·{' '}
                      {new Date(question.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          ) : (
            <CareerEmpty
              title="No visible career questions"
              description="Public student questions and private threads assigned to you will appear here."
            />
          )}
        </section>
        <section className="career-panel">
          <div className="career-panel-head">
            <div>
              <span className="eyebrow">YOUR CONTRIBUTIONS</span>
              <h2>Previous responses</h2>
            </div>
            <Link to={careerPaths.questions}>
              Career questions <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <CareerLoading />
          ) : previousAnswers.length ? (
            <div className="alumni-response-list">
              {previousAnswers.map(({ question, answer }) => (
                <article key={`${question._id}-${answer._id || answer.createdAt}`}>
                  <p>{answer.content}</p>
                  <Link to={`${careerPaths.questions}/${question._id}`}>
                    {question.title} <ArrowRight size={13} />
                  </Link>
                  <small>
                    {answer.createdAt
                      ? new Date(answer.createdAt).toLocaleDateString()
                      : 'Response date unavailable'}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <CareerEmpty
              title="No previous responses"
              description="Your answers to student career questions will appear here."
              action={<Link to={careerPaths.questions}>Answer a question</Link>}
            />
          )}
        </section>
        <section className="career-panel">
          <div className="career-panel-head">
            <div>
              <span className="eyebrow">MENTORSHIP</span>
              <h2>Student requests</h2>
            </div>
            <Link to={careerPaths.mentorship}>
              Manage requests <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <CareerLoading />
          ) : pendingMentorship.length ? (
            <div className="career-mentorship-list">
              {pendingMentorship.slice(0, 4).map((request) => (
                <article className="career-mentorship-card" key={request._id}>
                  <div className="career-network-row">
                    <Avatar
                      name={typeof request.student === 'string' ? 'Student' : request.student.name}
                      src={typeof request.student === 'string' ? undefined : request.student.avatar}
                      size="sm"
                    />
                    <div className="career-network-main">
                      <strong>{request.subject}</strong>
                      <small>
                        {typeof request.student === 'string' ? 'Student' : request.student.name} ·{' '}
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ''}
                      </small>
                    </div>
                    <Badge variant="warning" size="sm">
                      Pending
                    </Badge>
                  </div>
                  <p>{request.message}</p>
                  <Link to={careerPaths.mentorship}>
                    Review request <ArrowRight size={14} />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <CareerEmpty
              title="No pending requests"
              description={
                activeMentorship.length
                  ? `${activeMentorship.length} active mentorship relationship${activeMentorship.length === 1 ? '' : 's'} in progress.`
                  : 'Student mentorship requests will appear here.'
              }
            />
          )}
        </section>
        <section className="career-panel">
          <div className="career-panel-head">
            <div>
              <span className="eyebrow">YOUR NETWORK</span>
              <h2>Connections</h2>
            </div>
            <Link to={careerPaths.connections}>
              Manage network <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <CareerLoading />
          ) : (
            <div className="alumni-network-summary">
              <p>
                <strong>{accepted.length}</strong> accepted connection
                {accepted.length === 1 ? '' : 's'}
              </p>
              <p>
                <strong>{incoming.length}</strong> incoming request
                {incoming.length === 1 ? '' : 's'} awaiting your response
              </p>
              <Link className="button button-secondary button-sm" to={careerPaths.connections}>
                Open connections
              </Link>
            </div>
          )}
        </section>
        <section className="career-panel">
          <div className="career-panel-head">
            <div>
              <span className="eyebrow">MESSAGING</span>
              <h2>Recent conversations</h2>
            </div>
            <Link to={careerPaths.conversations}>
              Open inbox <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <CareerLoading />
          ) : recentConversations.length ? (
            <div className="alumni-conversation-list">
              {recentConversations.map((conversation) => {
                const title = conversation.isGroup
                  ? conversation.name || 'Group conversation'
                  : conversation.participants
                      .map((p) => participantName(p, user?._id))
                      .filter(Boolean)
                      .join(', ') || 'Conversation';
                return (
                  <Link
                    to={`${careerPaths.conversations}/${conversation._id}`}
                    key={conversation._id}
                  >
                    <Avatar name={title} size="xs" />
                    <div>
                      <strong>{title}</strong>
                      <small>{conversation.lastMessage?.content || 'No messages yet'}</small>
                    </div>
                    <MessageCircle size={15} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <CareerEmpty
              title="No conversations yet"
              description="Messages from your professional and student network will appear here."
              action={<Link to={careerPaths.conversations}>Open inbox</Link>}
            />
          )}
        </section>
      </div>
      <div className="alumni-guidance-links">
        <Link to={careerPaths.questions}>
          <MessageCircleQuestion />
          <span>
            <strong>Answer career questions</strong>
            <small>Share practical company, interview, and industry guidance.</small>
          </span>
          <ArrowRight />
        </Link>
        <Link to={careerPaths.connections}>
          <UsersRound />
          <span>
            <strong>Grow your network</strong>
            <small>Review connection requests and message accepted connections.</small>
          </span>
          <ArrowRight />
        </Link>
        <Link to={careerPaths.conversations}>
          <MessagesSquare />
          <span>
            <strong>Continue conversations</strong>
            <small>Message students and alumni through your existing conversations.</small>
          </span>
          <ArrowRight />
        </Link>
      </div>
    </div>
  );
}

function AlumniMetric({
  label,
  value,
  to,
  icon,
}: {
  label: string;
  value: string | number;
  to: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="career-metric">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
      <Link to={to} aria-label={`Open ${label}`}>
        <ArrowRight size={15} />
      </Link>
    </Card>
  );
}
