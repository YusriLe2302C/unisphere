import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getMyResearchPapers,
  getResearchAssignments,
  submitPaperReview,
  type ResearchAssignment,
  type ResearchPaper,
  type ReviewVerdict,
} from '../../services/research/research-api';
import {
  ResearchEmpty,
  ResearchError,
  ResearchLoading,
  ResearchNavigation,
  ResearchPageHeading,
  ResearchStatusBadge,
} from './research-components';
import { researchPaths } from './research-paths';
import './research.css';

interface ReviewDraft {
  verdict: ReviewVerdict;
  comments: string;
  novelty: string;
  methodology: string;
  clarity: string;
  ethicalCompliance: boolean;
}
const defaultDraft: ReviewDraft = {
  verdict: 'approved',
  comments: '',
  novelty: '',
  methodology: '',
  clarity: '',
  ethicalCompliance: true,
};

export function ResearchReviewsPage() {
  const { session, user } = useAuth();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [assignments, setAssignments] = useState<ResearchAssignment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    const [paperResult, assignmentResult] = await Promise.allSettled([
      getMyResearchPapers(session.token),
      getResearchAssignments(session.token),
    ]);
    const errors: string[] = [];
    if (paperResult.status === 'fulfilled') setPapers(paperResult.value);
    else
      errors.push(
        paperResult.reason instanceof ApiError
          ? paperResult.reason.message
          : 'Assigned research could not be loaded.',
      );
    if (assignmentResult.status === 'fulfilled') setAssignments(assignmentResult.value);
    else
      errors.push(
        assignmentResult.reason instanceof ApiError
          ? assignmentResult.reason.message
          : 'Research assignments could not be loaded.',
      );
    setError(errors.join(' '));
    setLoading(false);
  }, [session?.token]);
  useEffect(() => {
    void load();
  }, [load]);
  const pending = useMemo(
    () =>
      papers.filter(
        (paper) =>
          (paper.lifecycleStatus === 'pending_proctor' && paper.assignedProctorId === user?._id) ||
          (paper.lifecycleStatus === 'pending_guide' &&
            (paper.assignedProjectGuideIds?.includes(user?._id ?? '') ||
              paper.assignedProjectGuideId === user?._id)),
      ),
    [papers, user?._id],
  );

  async function submit(event: FormEvent<HTMLFormElement>, paper: ResearchPaper) {
    event.preventDefault();
    if (!session?.token) return;
    const draft = drafts[paper._id] ?? defaultDraft;
    setBusyId(paper._id);
    setError('');
    setSuccess('');
    const criteriaScores = {
      ...(draft.novelty && { novelty: Number(draft.novelty) }),
      ...(draft.methodology && { methodology: Number(draft.methodology) }),
      ...(draft.clarity && { clarity: Number(draft.clarity) }),
      ethicalCompliance: draft.ethicalCompliance,
    };
    try {
      await submitPaperReview(session.token, paper._id, {
        verdict: draft.verdict,
        comments: draft.comments.trim(),
        criteriaScores,
      });
      setSuccess(
        `Your ${paper.lifecycleStatus === 'pending_proctor' ? 'Proctor' : 'Project Guide'} review was submitted.`,
      );
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Review could not be submitted.');
    } finally {
      setBusyId('');
    }
  }

  const activeAssignments = assignments.filter((assignment) => assignment.status === 'active');
  return (
    <div className="research-page">
      <ResearchNavigation active="reviews" />
      <ResearchPageHeading
        title="Research reviews"
        description="Review assignments and the current paper workflow stage from your R&D queue."
        action={
          <Link className="button button-secondary" to={researchPaths.mine}>
            My research records
          </Link>
        }
      />
      {error && <ResearchError message={error} onRetry={() => void load()} />}
      {success && (
        <p className="research-action-success" role="status">
          {success}
        </p>
      )}
      <section className="research-panel">
        <div className="research-panel-heading">
          <div>
            <span className="eyebrow">REVIEW QUEUE</span>
            <h2>Submissions awaiting my decision</h2>
          </div>
          <Badge variant="warning">{pending.length} pending</Badge>
        </div>
        {loading ? (
          <ResearchLoading label="Loading review queue…" />
        ) : pending.length ? (
          <div className="research-review-queue">
            {pending.map((paper) => (
              <ReviewCard
                key={`${paper._id}-${paper.lifecycleStatus}`}
                paper={paper}
                draft={drafts[paper._id] ?? defaultDraft}
                busy={busyId === paper._id}
                onChange={(draft) => setDrafts((current) => ({ ...current, [paper._id]: draft }))}
                onSubmit={(event) => void submit(event, paper)}
              />
            ))}
          </div>
        ) : (
          <ResearchEmpty
            title="No papers are awaiting your review"
            description="Only the reviewer assigned to the paper’s current workflow stage can submit a decision."
          />
        )}
      </section>
      <section className="research-panel">
        <div className="research-panel-heading">
          <div>
            <span className="eyebrow">REVIEWER ASSIGNMENTS</span>
            <h2>Active Proctor and Project Guide assignments</h2>
          </div>
        </div>
        {activeAssignments.length ? (
          <div className="research-assignment-list">
            {activeAssignments.map((assignment) => (
              <article key={assignment._id}>
                <span className="research-assignment-icon">
                  <ClipboardCheck size={16} />
                </span>
                <div>
                  <strong>
                    {assignment.assignmentType === 'proctor' ? 'Proctor' : 'Project Guide'}
                  </strong>
                  <small>
                    {user?.role === 'student'
                      ? `Assigned to ${typeof assignment.faculty === 'object' ? assignment.faculty.name : 'faculty reviewer'}`
                      : `Student ${typeof assignment.student === 'object' ? assignment.student.name : 'record'}`}
                  </small>
                </div>
                <ResearchStatusBadge status={assignment.status} />
              </article>
            ))}
          </div>
        ) : (
          <p className="research-muted">
            No active reviewer assignments are returned for your account.
          </p>
        )}
      </section>
    </div>
  );
}

function ReviewCard({
  paper,
  draft,
  busy,
  onChange,
  onSubmit,
}: {
  paper: ResearchPaper;
  draft: ReviewDraft;
  busy: boolean;
  onChange: (draft: ReviewDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="research-review-card">
      <header>
        <div>
          <div className="research-publication-tags">
            <ResearchStatusBadge status={paper.lifecycleStatus} />
            <Badge variant="outline">
              {paper.lifecycleStatus === 'pending_proctor'
                ? 'Proctor review'
                : 'Project Guide review'}
            </Badge>
          </div>
          <h3>
            <Link to={`/app/research/papers/${encodeURIComponent(paper._id)}`}>{paper.title}</Link>
          </h3>
          <p>
            {paper.subject} · revision {paper.revisionRound ?? 1}
          </p>
        </div>
        <Link
          className="research-inline-link"
          to={`/app/research/papers/${encodeURIComponent(paper._id)}`}
        >
          Open submission <ArrowRight size={14} />
        </Link>
      </header>
      <p className="research-review-abstract">{paper.abstract}</p>
      <form className="research-review-form" onSubmit={onSubmit}>
        <label>
          Decision
          <select
            value={draft.verdict}
            onChange={(event) =>
              onChange({ ...draft, verdict: event.target.value as ReviewVerdict })
            }
          >
            <option value="approved">Approve</option>
            <option value="changes_requested">Request changes</option>
            <option value="rejected">Reject</option>
          </select>
        </label>
        <label className="review-comments">
          Feedback
          <Textarea
            value={draft.comments}
            onChange={(event) => onChange({ ...draft, comments: event.target.value })}
            required
            rows={3}
          />
        </label>
        <div className="research-score-fields">
          <label>
            Novelty (1–10)
            <input
              type="number"
              min="1"
              max="10"
              value={draft.novelty}
              onChange={(event) => onChange({ ...draft, novelty: event.target.value })}
            />
          </label>
          <label>
            Methodology (1–10)
            <input
              type="number"
              min="1"
              max="10"
              value={draft.methodology}
              onChange={(event) => onChange({ ...draft, methodology: event.target.value })}
            />
          </label>
          <label>
            Clarity (1–10)
            <input
              type="number"
              min="1"
              max="10"
              value={draft.clarity}
              onChange={(event) => onChange({ ...draft, clarity: event.target.value })}
            />
          </label>
          <label className="research-checkbox">
            <input
              type="checkbox"
              checked={draft.ethicalCompliance}
              onChange={(event) => onChange({ ...draft, ethicalCompliance: event.target.checked })}
            />{' '}
            Ethical compliance
          </label>
        </div>
        <Button type="submit" loading={busy} leadingIcon={<CheckCircle2 size={15} />}>
          Submit review decision
        </Button>
      </form>
    </Card>
  );
}
