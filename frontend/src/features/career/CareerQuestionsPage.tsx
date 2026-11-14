import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, MessageCircleQuestion, Search, Send } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Avatar, Badge, Button, Card, Input, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  answerCareerQuestion,
  createCareerQuestion,
  followUpCareerQuestion,
  getCareerQuestion,
  getCareerQuestions,
  type CareerQuestion,
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

export function CareerQuestionsPage() {
  const { questionId } = useParams();
  const { session, user } = useAuth();
  const [questions, setQuestions] = useState<CareerQuestion[]>([]);
  const [question, setQuestion] = useState<CareerQuestion | null>(null);
  const [search, setSearch] = useState('');
  const [answerFilter, setAnswerFilter] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      if (questionId) {
        const r = await getCareerQuestion(session.token, questionId);
        setQuestion(r.question);
      } else {
        const r = await getCareerQuestions(session.token);
        setQuestions(r.questions);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Career questions could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.token, questionId]);
  useEffect(() => {
    void load();
  }, [load]);
  const visible = useMemo(
    () =>
      questions.filter(
        (q) =>
          `${q.title} ${q.body} ${q.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()) &&
          (answerFilter === 'all' ||
            (answerFilter === 'answered' ? q.answers.length > 0 : q.answers.length === 0)),
      ),
    [questions, search, answerFilter],
  );
  const canAnswerQuestion =
    Boolean(
      user?.role === 'alumni' &&
      question &&
      (question.visibility === 'public' ||
        (typeof question.assignedMentor === 'object' && question.assignedMentor._id === user._id)),
    ) || ['admin', 'dean', 'principal', 'superadmin'].includes(user?.role || '');
  async function create(e: FormEvent) {
    e.preventDefault();
    if (!session?.token) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await createCareerQuestion(session.token, {
        title: title.trim(),
        body: body.trim(),
        tags: [],
      });
      setTitle('');
      setBody('');
      setSuccess('Your question was shared with the institution community.');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Your question could not be posted.');
    } finally {
      setBusy(false);
    }
  }
  async function respond(e: FormEvent) {
    e.preventDefault();
    if (!session?.token || !question) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (canAnswerQuestion) await answerCareerQuestion(session.token, question._id, reply.trim());
      else await followUpCareerQuestion(session.token, question._id, reply.trim());
      setReply('');
      setSuccess(canAnswerQuestion ? 'Your answer was posted.' : 'Your follow-up was posted.');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Your response could not be posted.');
    } finally {
      setBusy(false);
    }
  }
  if (questionId)
    return (
      <div className="career-page">
        <CareerNav active="questions" />
        <Link to={careerPaths.questions} className="career-back-link">
          <ArrowLeft size={15} /> All questions
        </Link>
        {error && <CareerError message={error} retry={() => void load()} />}
        {loading ? (
          <CareerLoading />
        ) : (
          question && (
            <>
              <CareerHeading
                title={question.title}
                description="Career question and community responses"
              />
              <Card className="career-question-detail">
                <div className="career-question-detail-meta">
                  <Badge variant={question.visibility === 'public' ? 'brand' : 'warning'}>
                    {question.visibility === 'public'
                      ? 'Institution community'
                      : 'Private mentor thread'}
                  </Badge>
                  <span>{new Date(question.createdAt).toLocaleString()}</span>
                  <span>{question.answers.length} answers</span>
                </div>
                <p className="career-question-body">{question.body}</p>
                <div className="career-question-author">
                  <Avatar
                    name={typeof question.author === 'string' ? 'Student' : question.author.name}
                    src={typeof question.author === 'string' ? undefined : question.author.avatar}
                    size="sm"
                  />
                  <div>
                    <strong>
                      {typeof question.author === 'string'
                        ? 'Community member'
                        : question.author.name}
                    </strong>
                    <small>{typeof question.author === 'string' ? '' : question.author.role}</small>
                  </div>
                </div>
              </Card>
              <section className="career-panel">
                <div className="career-panel-head">
                  <div>
                    <span className="eyebrow">COMMUNITY RESPONSES</span>
                    <h2>Answers and follow-ups</h2>
                  </div>
                </div>
                {question.answers.length ? (
                  <div className="career-thread">
                    {question.answers.map((a, i) => (
                      <article className="career-thread-item career-answer" key={a._id || i}>
                        <div className="career-thread-person">
                          <Avatar
                            name={typeof a.responder === 'string' ? 'Alumni' : a.responder.name}
                            src={typeof a.responder === 'string' ? undefined : a.responder.avatar}
                            size="sm"
                          />
                          <div>
                            <strong>
                              {typeof a.responder === 'string' ? 'Alumni' : a.responder.name}
                            </strong>
                            <small>
                              {typeof a.responder === 'string' ? '' : a.responder.role} ·{' '}
                              {a.createdAt
                                ? new Date(a.createdAt).toLocaleString()
                                : 'Time unavailable'}
                            </small>
                          </div>
                          {a.isVerifiedFaculty && (
                            <Badge variant="success" size="sm">
                              Verified faculty
                            </Badge>
                          )}
                        </div>
                        <p>{a.content}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <CareerEmpty
                    title="No answers yet"
                    description="Alumni answers will appear here."
                  />
                )}
                {question.followUps?.map((f, i) => (
                  <article className="career-thread-item" key={f._id || i}>
                    <div className="career-thread-person">
                      <Avatar
                        name={typeof f.author === 'string' ? 'Participant' : f.author.name}
                        src={typeof f.author === 'string' ? undefined : f.author.avatar}
                        size="sm"
                      />
                      <div>
                        <strong>
                          {typeof f.author === 'string' ? 'Participant' : f.author.name}
                        </strong>
                        <small>{new Date(f.createdAt).toLocaleString()}</small>
                      </div>
                    </div>
                    <p>{f.content}</p>
                  </article>
                ))}
              </section>
              {!question.isClosed &&
                (question.visibility === 'public' ||
                  (typeof question.author === 'object' && question.author._id === user?._id) ||
                  (typeof question.assignedMentor === 'object' &&
                    question.assignedMentor._id === user?._id) ||
                  question.answers.some(
                    (answer) =>
                      typeof answer.responder === 'object' && answer.responder._id === user?._id,
                  ) ||
                  question.followUps?.some(
                    (followUp) =>
                      typeof followUp.author === 'object' && followUp.author._id === user?._id,
                  )) && (
                  <Card className="career-response-box">
                    <form onSubmit={respond}>
                      <label htmlFor="career-response">
                        {canAnswerQuestion ? 'Share your answer' : 'Ask a follow-up'}
                      </label>
                      <Textarea
                        id="career-response"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={4}
                        required
                        maxLength={10000}
                        placeholder="Write a helpful, respectful response…"
                      />
                      <Button type="submit" loading={busy} leadingIcon={<Send size={15} />}>
                        {canAnswerQuestion ? 'Post answer' : 'Post follow-up'}
                      </Button>
                    </form>
                  </Card>
                )}
            </>
          )
        )}
        {success && (
          <p role="status" className="career-success">
            {success}
          </p>
        )}
      </div>
    );
  return (
    <div className="career-page">
      <CareerNav active="questions" />
      <CareerHeading
        title="Career questions"
        description="Ask RNS alumni about employers, interviews, career preparation, and industry experience."
      />
      <Card className="career-ask-card">
        <div>
          <span className="eyebrow">ASK THE ALUMNI COMMUNITY</span>
          <h2>What would you like to know?</h2>
        </div>
        <form onSubmit={create}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Question title"
            aria-label="Question title"
            required
            maxLength={200}
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add context to help alumni give a useful answer…"
            aria-label="Question details"
            rows={3}
            required
            maxLength={10000}
          />
          <Button type="submit" loading={busy} leadingIcon={<MessageCircleQuestion size={15} />}>
            Post question
          </Button>
        </form>
      </Card>
      {success && (
        <p role="status" className="career-success">
          {success}
        </p>
      )}
      {error && <CareerError message={error} retry={() => void load()} />}
      <div className="career-question-tools">
        <h2>Questions from your institution</h2>
        <div className="career-question-search-controls">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions and topics"
            aria-label="Search questions"
            leadingIcon={<Search size={15} />}
          />
          <select
            aria-label="Filter questions by answers"
            value={answerFilter}
            onChange={(event) => setAnswerFilter(event.target.value as typeof answerFilter)}
          >
            <option value="all">All questions</option>
            <option value="unanswered">Unanswered</option>
            <option value="answered">Answered</option>
          </select>
        </div>
      </div>
      {loading ? (
        <CareerLoading />
      ) : visible.length ? (
        <div className="career-question-list career-question-cards">
          {visible.map((q) => (
            <Link
              to={`${careerPaths.questions}/${q._id}`}
              key={q._id}
              className="career-question-row"
            >
              <div className="career-question-row-icon">
                <MessageCircleQuestion size={17} />
              </div>
              <div className="career-question-row-content">
                <div className="career-question-detail-meta">
                  <Badge variant="brand" size="sm">
                    {q.visibility === 'public' ? 'Career question' : 'Mentor thread'}
                  </Badge>
                  <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                </div>
                <h3>{q.title}</h3>
                <p>{q.body}</p>
                <small>
                  {q.answers.length} {q.answers.length === 1 ? 'answer' : 'answers'} · asked by{' '}
                  {typeof q.author === 'string' ? 'community member' : q.author.name}
                </small>
              </div>
              <ArrowLeft className="career-question-open" size={16} />
            </Link>
          ))}
        </div>
      ) : (
        <CareerEmpty
          title="No matching questions"
          description="Try another search or post the first question."
        />
      )}
    </div>
  );
}
