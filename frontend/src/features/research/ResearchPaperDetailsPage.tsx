import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Download, ExternalLink, RotateCcw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  downloadResearchFile,
  getPaperReviews,
  getResearchPaper,
  resubmitResearchPaper,
  type ResearchPaper,
  type ResearchReview,
} from '../../services/research/research-api';
import {
  ResearchError,
  ResearchLoading,
  ResearchNavigation,
  ResearchStatusBadge,
} from './research-components';
import { researchPaths } from './research-paths';
import './research.css';

function personId(person: string | { _id: string } | undefined): string | undefined {
  return typeof person === 'string' ? person : person?._id;
}

export function ResearchPaperDetailsPage() {
  const { paperId = '' } = useParams();
  const { session, user } = useAuth();
  const [paper, setPaper] = useState<ResearchPaper | null>(null);
  const [reviews, setReviews] = useState<ResearchReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session?.token || !paperId) return;
    setLoading(true);
    setError('');
    try {
      const record = await getResearchPaper(session.token, paperId);
      setPaper(record);
      try {
        setReviews(await getPaperReviews(session.token, paperId));
      } catch {
        setReviews([]);
      }
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : 'Research record could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token, paperId]);
  useEffect(() => {
    void load();
  }, [load]);

  async function resubmit() {
    if (!session?.token || !paper) return;
    setBusy(true);
    setActionError('');
    setActionMessage('');
    try {
      const result = await resubmitResearchPaper(session.token, paper._id);
      setPaper(result.paper);
      setActionMessage(`Resubmitted for review · revision ${result.revisionRound}.`);
    } catch (reason) {
      setActionError(
        reason instanceof ApiError ? reason.message : 'This submission could not be resubmitted.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string, filename: string) {
    if (!session?.token) return;
    setActionError('');
    try {
      await downloadResearchFile(id, session.token, filename);
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : 'The attachment could not be downloaded.',
      );
    }
  }

  if (loading) return <ResearchLoading label="Loading research record…" />;
  if (error || !paper)
    return (
      <div className="research-page">
        <ResearchNavigation active="mine" />
        <ResearchError
          message={error || 'Research record not found.'}
          onRetry={() => void load()}
        />
        <Link className="research-inline-link" to={researchPaths.publications}>
          <ArrowLeft size={14} /> Back to publications
        </Link>
      </div>
    );
  const isOwner = personId(paper.submittedBy) === user?._id;
  const submittedByName =
    typeof paper.submittedBy === 'object' ? paper.submittedBy.name : paper.authors?.[0]?.name;
  const isStudentRejected =
    paper.isStudentSubmission && isOwner && paper.lifecycleStatus === 'rejected';
  const showWorkflow = Boolean(paper.isStudentSubmission || reviews.length);

  return (
    <div className="research-page">
      <ResearchNavigation active={isOwner ? 'mine' : 'publications'} />
      <Link
        to={isOwner ? researchPaths.mine : researchPaths.publications}
        className="research-back-link"
      >
        <ArrowLeft size={14} /> {isOwner ? 'My research' : 'Publications'}
      </Link>
      <article className="research-detail-card">
        <div className="research-detail-top">
          <div className="research-publication-tags">
            <Badge variant="brand">{paper.publicationType}</Badge>
            <ResearchStatusBadge status={paper.lifecycleStatus} />
            {paper.visibility && (
              <Badge variant="outline">{paper.visibility.replace('-', ' ')}</Badge>
            )}
          </div>
          <h1>{paper.title}</h1>
          <p className="research-detail-authors">
            {paper.authors?.map((author) => author.name).join(', ') ||
              'Author information unavailable'}
          </p>
          <p className="research-detail-abstract">{paper.abstract}</p>
          <div className="research-detail-meta">
            <span>
              Subject <strong>{paper.subject}</strong>
            </span>
            <span>
              Institution <strong>{paper.institution || 'Not provided'}</strong>
            </span>
            <span>
              Published <strong>{new Date(paper.publicationDate).toLocaleDateString()}</strong>
            </span>
            {submittedByName && (
              <span>
                Record by <strong>{submittedByName}</strong>
              </span>
            )}
            {paper.doi && (
              <span>
                DOI <strong>{paper.doi}</strong>
              </span>
            )}
          </div>
          {paper.tags?.length > 0 && (
            <div className="research-publication-tags">
              {paper.tags.map((tag) => (
                <Badge key={tag} variant="outline" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="research-detail-actions">
          {paper.externalUrl && (
            <a
              className="button button-secondary"
              href={paper.externalUrl}
              target="_blank"
              rel="noreferrer"
            >
              External publication <ExternalLink size={14} />
            </a>
          )}
          {paper.pdfUrl && (
            <a
              className="button button-secondary"
              href={paper.pdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open PDF <ArrowUpRight size={14} />
            </a>
          )}
          {paper.fileAttachmentId && (
            <Button
              variant="outline"
              leadingIcon={<Download size={15} />}
              onClick={() => void download(paper.fileAttachmentId!, `${paper.title}.pdf`)}
            >
              Download attached paper
            </Button>
          )}
          {paper.datasetUrl && (
            <a
              className="button button-secondary"
              href={paper.datasetUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open dataset <ExternalLink size={14} />
            </a>
          )}
          {paper.datasetFileId && (
            <Button
              variant="outline"
              leadingIcon={<Download size={15} />}
              onClick={() => void download(paper.datasetFileId!, `${paper.title}-dataset`)}
            >
              Download dataset
            </Button>
          )}
        </div>
        {actionError && (
          <p className="research-action-error" role="alert">
            {actionError}
          </p>
        )}
        {actionMessage && (
          <p className="research-action-success" role="status">
            {actionMessage}
          </p>
        )}
      </article>

      {isStudentRejected && (
        <Card className="research-resubmit-card">
          <div>
            <span className="eyebrow">CHANGES REQUESTED</span>
            <h2>Update and resubmit</h2>
            <p>
              Make permitted metadata changes, then resubmit this record for the assigned Proctor
              and Project Guide workflow.
            </p>
          </div>
          <div className="research-resubmit-actions">
            <Link
              className="button button-secondary"
              to={`${researchPaths.submit}?edit=${encodeURIComponent(paper._id)}`}
            >
              Edit submission
            </Link>
            <Button
              leadingIcon={<RotateCcw size={15} />}
              loading={busy}
              onClick={() => void resubmit()}
            >
              Resubmit unchanged
            </Button>
          </div>
        </Card>
      )}

      {showWorkflow && (
        <section className="research-panel">
          <div className="research-panel-heading">
            <div>
              <span className="eyebrow">REVIEW WORKFLOW</span>
              <h2>Submission history and feedback</h2>
            </div>
            <ResearchStatusBadge status={paper.lifecycleStatus} />
          </div>
          <div className="research-workflow-summary">
            <span>
              Revision round <strong>{paper.revisionRound ?? 1}</strong>
            </span>
            {paper.assignedProctorId && (
              <span>
                Proctor assigned <strong>Yes</strong>
              </span>
            )}
            {(paper.assignedProjectGuideIds?.length ?? 0) > 0 && (
              <span>
                Project Guides <strong>{paper.assignedProjectGuideIds?.length}</strong>
              </span>
            )}
          </div>
          {reviews.length ? (
            <ol className="research-review-history">
              {reviews.map((review) => (
                <li key={review._id}>
                  <div className="research-review-heading">
                    <ResearchStatusBadge status={review.verdict} />
                    <Badge variant="outline" size="sm">
                      {review.reviewerRole.replace('_', ' ')}
                    </Badge>
                    <span>
                      Revision {review.revisionRound} ·{' '}
                      {new Date(review.reviewedAt).toLocaleString()}
                    </span>
                  </div>
                  <p>{review.comments}</p>
                  {review.criteriaScores && (
                    <small>
                      Novelty {review.criteriaScores.novelty ?? '—'} · Methodology{' '}
                      {review.criteriaScores.methodology ?? '—'} · Clarity{' '}
                      {review.criteriaScores.clarity ?? '—'} · Ethics{' '}
                      {review.criteriaScores.ethicalCompliance === undefined
                        ? '—'
                        : review.criteriaScores.ethicalCompliance
                          ? 'Compliant'
                          : 'Needs review'}
                    </small>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="research-muted">No review decisions are available yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
