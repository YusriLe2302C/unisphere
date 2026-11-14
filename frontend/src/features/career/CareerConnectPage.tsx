import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Handshake,
  MessageCircleQuestion,
  MessagesSquare,
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
  getMentorshipRequests,
  type CareerConnection,
  type CareerQuestion,
  type CareerOpportunity,
  type MentorshipRequest,
} from '../../services/career/career-api';
import {
  CareerEmpty,
  CareerError,
  CareerHeading,
  CareerLoading,
  CareerMetric,
  CareerNav,
} from './career-components';
import { formatCareerDeadline } from './career-format';
import { careerPaths } from './career-paths';
import './career.css';

export function CareerConnectPage() {
  const { session, user } = useAuth();
  const [questions, setQuestions] = useState<CareerQuestion[]>([]);
  const [connections, setConnections] = useState<CareerConnection[]>([]);
  const [mentorship, setMentorship] = useState<MentorshipRequest[]>([]);
  const [opportunities, setOpportunities] = useState<CareerOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    const result = await Promise.allSettled([
      getCareerQuestions(session.token),
      getCareerConnections(session.token),
      getMentorshipRequests(session.token),
      getCareerOpportunities(user?.institution || ''),
    ]);
    const failures: string[] = [];
    if (result[0].status === 'fulfilled') setQuestions(result[0].value.questions);
    else
      failures.push(
        result[0].reason instanceof ApiError
          ? result[0].reason.message
          : 'Career questions could not be loaded.',
      );
    if (result[1].status === 'fulfilled') setConnections(result[1].value.connections);
    else
      failures.push(
        result[1].reason instanceof ApiError
          ? result[1].reason.message
          : 'Connections could not be loaded.',
      );
    if (result[2].status === 'fulfilled') setMentorship(result[2].value.requests);
    else
      failures.push(
        result[2].reason instanceof ApiError
          ? result[2].reason.message
          : 'Mentorship activity could not be loaded.',
      );
    if (result[3].status === 'fulfilled') {
      setOpportunities(result[3].value.opportunities.slice(0, 3));
    }
    setError(failures.join(' '));
    setLoading(false);
  }, [session?.token, user?.institution]);
  useEffect(() => {
    void load();
  }, [load]);
  const answers = questions.reduce((sum, q) => sum + q.answers.length, 0);
  const accepted = connections.filter((c) => c.status === 'accepted');
  const recentAnswers = questions
    .flatMap((q) => q.answers.map((a) => ({ question: q, answer: a })))
    .sort(
      (a, b) =>
        new Date(b.answer.createdAt || 0).getTime() - new Date(a.answer.createdAt || 0).getTime(),
    )
    .slice(0, 4);
  return (
    <div className="career-page">
      <CareerNav active="home" />
      <CareerHeading
        title={`Career Connect${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description={`Connect with ${user?.institution ? `${user.institution} alumni` : 'alumni'}, exchange career experience, and build professional relationships.`}
        action={
          <Link to={careerPaths.questions} className="button button-primary">
            <MessageCircleQuestion size={16} /> Ask a question
          </Link>
        }
      />
      {error && <CareerError message={error} retry={() => void load()} />}
      <section className="career-metrics">
        <CareerMetric
          label="Career questions"
          value={loading ? '—' : questions.length}
          to={careerPaths.questions}
          icon={<MessageCircleQuestion size={18} />}
        />
        <CareerMetric
          label="Alumni answers"
          value={loading ? '—' : answers}
          to={careerPaths.questions}
          icon={<MessagesSquare size={18} />}
        />
        <CareerMetric
          label="Connections"
          value={loading ? '—' : accepted.length}
          to={careerPaths.connections}
          icon={<UsersRound size={18} />}
        />
        <CareerMetric
          label="Mentorship activity"
          value={loading ? '—' : mentorship.length}
          to={careerPaths.mentorship}
          icon={<Handshake size={18} />}
        />
      </section>
      {opportunities.length > 0 && (
        <section className="career-panel">
          <div className="career-panel-head">
            <div>
              <span className="eyebrow">INSTITUTION OPPORTUNITIES</span>
              <h2>Career opportunities</h2>
            </div>
          </div>
          <div className="career-opportunity-list">
            {opportunities.map((opportunity) => (
              <article key={opportunity._id}>
                <div>
                  <Badge variant="brand" size="sm">
                    {opportunity.type}
                  </Badge>
                  <h3>{opportunity.title}</h3>
                  <p>
                    {opportunity.organization}
                    {opportunity.location ? ` · ${opportunity.location}` : ''}
                  </p>
                  <small>{formatCareerDeadline(opportunity.deadline)}</small>
                </div>
                {opportunity.applyUrl && (
                  <a
                    className="button button-secondary button-sm"
                    href={opportunity.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Opportunity details <ArrowRight size={14} />
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="career-dashboard-grid">
        <section className="career-panel">
          <div className="career-panel-head">
            <div>
              <span className="eyebrow">COMMUNITY KNOWLEDGE</span>
              <h2>Recent career questions</h2>
            </div>
            <Link to={careerPaths.questions}>
              Browse questions <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <CareerLoading />
          ) : questions.length ? (
            <div className="career-question-list">
              {questions.slice(0, 5).map((q) => (
                <Link
                  key={q._id}
                  to={`${careerPaths.questions}/${q._id}`}
                  className="career-question-row"
                >
                  <div>
                    <h3>{q.title}</h3>
                    <p>{q.body}</p>
                    <small>
                      {q.answers.length} {q.answers.length === 1 ? 'answer' : 'answers'} ·{' '}
                      {new Date(q.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <CareerEmpty
              title="No questions yet"
              description="Questions shared with your institution will show here."
            />
          )}
        </section>
        <section className="career-panel">
          <div className="career-panel-head">
            <div>
              <span className="eyebrow">ALUMNI EXPERIENCE</span>
              <h2>Recent answers</h2>
            </div>
          </div>
          {loading ? (
            <CareerLoading />
          ) : recentAnswers.length ? (
            <div className="career-answer-list">
              {recentAnswers.map(({ question, answer }) => (
                <article key={`${question._id}-${answer._id}`}>
                  <div className="career-answer-author">
                    <Avatar
                      name={typeof answer.responder === 'string' ? 'Alumni' : answer.responder.name}
                      src={
                        typeof answer.responder === 'string' ? undefined : answer.responder.avatar
                      }
                      size="xs"
                    />
                    <strong>
                      {typeof answer.responder === 'string' ? 'Alumni' : answer.responder.name}
                    </strong>
                    <span>answered</span>
                  </div>
                  <p>{answer.content}</p>
                  <Link to={`${careerPaths.questions}/${question._id}`}>
                    {question.title} <ArrowRight size={13} />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <CareerEmpty
              title="No answers to show"
              description="Alumni responses to career questions will appear here."
            />
          )}
        </section>
      </div>
      <section className="career-panel career-shortcuts">
        <div className="career-panel-head">
          <div>
            <span className="eyebrow">BUILD YOUR NETWORK</span>
            <h2>Continue your career journey</h2>
          </div>
        </div>
        <div className="career-shortcut-grid">
          <Link to={careerPaths.alumni}>
            <UsersRound />
            <strong>Explore alumni</strong>
            <span>Find professionals by company, industry, or skill.</span>
          </Link>
          <Link to={careerPaths.mentorship}>
            <Handshake />
            <strong>Mentorship</strong>
            <span>Manage mentorship requests and active relationships.</span>
          </Link>
          <Link to={careerPaths.connections}>
            <UsersRound />
            <strong>Connections</strong>
            <span>Review incoming requests and accepted connections.</span>
          </Link>
          <Link to={careerPaths.conversations}>
            <MessagesSquare />
            <strong>Conversations</strong>
            <span>Continue private conversations with your network.</span>
          </Link>
        </div>
      </section>
      {user?.role === 'alumni' && (
        <Card className="career-note">
          <Badge variant="brand">Alumni participation</Badge>
          <span>Share your experience by answering questions from your institution community.</span>
        </Card>
      )}
    </div>
  );
}
