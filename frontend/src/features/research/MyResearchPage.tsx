import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, FilePlus2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getMyResearchPapers,
  getResearchAssignments,
  type ResearchAssignment,
  type ResearchPaper,
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

function displayPerson(value: string | { name: string } | undefined) {
  return typeof value === 'object' && value ? value.name : '';
}

export function MyResearchPage() {
  const { session, user } = useAuth();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [assignments, setAssignments] = useState<ResearchAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    const [paperResult, assignmentResult] = await Promise.allSettled([
      getMyResearchPapers(session.token),
      getResearchAssignments(session.token),
    ]);
    const failures: string[] = [];
    if (paperResult.status === 'fulfilled') setPapers(paperResult.value);
    else
      failures.push(
        paperResult.reason instanceof ApiError
          ? paperResult.reason.message
          : 'Your research records could not be loaded.',
      );
    if (assignmentResult.status === 'fulfilled') setAssignments(assignmentResult.value);
    else
      failures.push(
        assignmentResult.reason instanceof ApiError
          ? assignmentResult.reason.message
          : 'Reviewer assignments could not be loaded.',
      );
    setError(failures.join(' '));
    setLoading(false);
  }, [session?.token]);
  useEffect(() => {
    void load();
  }, [load]);
  const ownPapers = papers.filter(
    (paper) =>
      paper.submittedBy === user?._id ||
      (typeof paper.submittedBy === 'object' && paper.submittedBy._id === user?._id),
  );
  const pendingPapers = papers.filter(
    (paper) =>
      ['pending_proctor', 'pending_guide'].includes(paper.lifecycleStatus ?? '') &&
      (paper.assignedProctorId === user?._id ||
        paper.assignedProjectGuideId === user?._id ||
        paper.assignedProjectGuideIds?.includes(user?._id ?? '')),
  );

  return (
    <div className="research-page">
      <ResearchNavigation active="mine" />
      <ResearchPageHeading
        title="My research"
        description="Track your submissions, assigned reviews, and reviewer assignments."
        action={
          <Link className="button button-primary" to={researchPaths.submit}>
            <FilePlus2 size={15} /> New submission
          </Link>
        }
      />
      {error && <ResearchError message={error} onRetry={() => void load()} />}
      <section className="research-panel">
        <div className="research-panel-heading">
          <div>
            <span className="eyebrow">SUBMISSIONS & ASSIGNMENTS</span>
            <h2>
              {user?.role === 'student' ? 'My submitted records' : 'Research papers in my workflow'}
            </h2>
          </div>
          <span className="research-result-count">
            {ownPapers.length} submitted · {pendingPapers.length} awaiting my review
          </span>
        </div>
        {loading ? (
          <ResearchLoading />
        ) : papers.length ? (
          <div className="research-record-list">
            {papers.map((paper) => {
              const isMine = ownPapers.some((item) => item._id === paper._id);
              const actionable = !isMine && pendingPapers.some((item) => item._id === paper._id);
              return (
                <article className="research-record-row" key={paper._id}>
                  <div>
                    <div className="research-publication-tags">
                      <ResearchStatusBadge status={paper.lifecycleStatus} />
                      {paper.isStudentSubmission && (
                        <span className="research-row-note">Student review workflow</span>
                      )}
                    </div>
                    <h3>
                      <Link to={`/app/research/papers/${encodeURIComponent(paper._id)}`}>
                        {paper.title}
                      </Link>
                    </h3>
                    <p>
                      {paper.subject} · {paper.publicationType}
                      {!isMine && displayPerson(paper.submittedBy)
                        ? ` · Submitted by ${displayPerson(paper.submittedBy)}`
                        : ''}
                    </p>
                    {paper.lifecycleStatus === 'rejected' && isMine && (
                      <small>Reviewer feedback is available in submission details.</small>
                    )}
                  </div>
                  <div className="research-record-actions">
                    <Link
                      className="research-inline-link"
                      to={`/app/research/papers/${encodeURIComponent(paper._id)}`}
                    >
                      {actionable ? 'Review submission' : 'View record'} <ArrowRight size={14} />
                    </Link>
                    {paper.isStudentSubmission &&
                      paper.lifecycleStatus === 'rejected' &&
                      isMine && (
                        <Link
                          className="research-inline-link"
                          to={`${researchPaths.submit}?edit=${encodeURIComponent(paper._id)}`}
                        >
                          Edit
                        </Link>
                      )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <ResearchEmpty
            title="No research records yet"
            description="New submissions and reviewer assignments will appear here."
            action={
              <Link className="button button-primary" to={researchPaths.submit}>
                Create a submission
              </Link>
            }
          />
        )}
      </section>
      <section className="research-panel">
        <div className="research-panel-heading">
          <div>
            <span className="eyebrow">ASSIGNMENTS</span>
            <h2>Proctor and Project Guide assignments</h2>
          </div>
        </div>
        {loading ? (
          <ResearchLoading label="Loading reviewer assignments…" />
        ) : assignments.length ? (
          <div className="research-assignment-list">
            {assignments.map((assignment) => (
              <article key={assignment._id}>
                <span className="research-assignment-icon">
                  {assignment.assignmentType === 'proctor' ? 'P' : 'G'}
                </span>
                <div>
                  <strong>
                    {assignment.assignmentType === 'proctor' ? 'Proctor' : 'Project Guide'}
                  </strong>
                  <small>
                    {user?.role === 'student'
                      ? `Assigned to ${displayPerson(assignment.faculty) || 'Faculty reviewer'}`
                      : `Student ${displayPerson(assignment.student) || 'record'}`}
                    {assignment.collaborationId ? ' · Project linked' : ''}
                  </small>
                </div>
                <ResearchStatusBadge status={assignment.status} />
              </article>
            ))}
          </div>
        ) : (
          <ResearchEmpty
            title="No reviewer assignments returned"
            description="Assignments are created and maintained by institutional R&D authorities."
          />
        )}
      </section>
    </div>
  );
}
