import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  ClipboardCheck,
  FilePlus2,
  FlaskConical,
  Handshake,
  LibraryBig,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getCollaborations,
  getMyResearchPapers,
  getResearchAssignments,
  getResearchPapers,
  type ResearchCollaboration,
  type ResearchPaper,
} from '../../services/research/research-api';
import {
  ResearchEmpty,
  ResearchError,
  ResearchLoading,
  ResearchNavigation,
  ResearchPageHeading,
  ResearchStatusBadge,
  PublicationCard,
} from './research-components';
import { researchPaths } from './research-paths';
import './research.css';

export function ResearchDashboardPage() {
  const { session, user } = useAuth();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [myPapers, setMyPapers] = useState<ResearchPaper[]>([]);
  const [collaborations, setCollaborations] = useState<ResearchCollaboration[]>([]);
  const [publicationTotal, setPublicationTotal] = useState(0);
  const [collaborationTotal, setCollaborationTotal] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setErrors([]);
    const [paperResult, collaborationResult, mineResult, assignmentResult] =
      await Promise.allSettled([
        getResearchPapers(session.token, { page: 1, limit: 5 }),
        getCollaborations(session.token, { page: 1, limit: 4, status: 'open' }),
        getMyResearchPapers(session.token),
        getResearchAssignments(session.token),
      ]);
    const failures: string[] = [];
    if (paperResult.status === 'fulfilled') {
      setPapers(paperResult.value.papers);
      setPublicationTotal(paperResult.value.total);
    } else
      failures.push(
        paperResult.reason instanceof ApiError
          ? paperResult.reason.message
          : 'Publications could not be loaded.',
      );
    if (collaborationResult.status === 'fulfilled') {
      setCollaborations(collaborationResult.value.collaborations);
      setCollaborationTotal(collaborationResult.value.total);
    } else
      failures.push(
        collaborationResult.reason instanceof ApiError
          ? collaborationResult.reason.message
          : 'Collaborations could not be loaded.',
      );
    if (mineResult.status === 'fulfilled') setMyPapers(mineResult.value);
    else
      failures.push(
        mineResult.reason instanceof ApiError
          ? mineResult.reason.message
          : 'Your research records could not be loaded.',
      );
    if (assignmentResult.status === 'fulfilled')
      setReviewCount(
        assignmentResult.value.filter((assignment) => assignment.status === 'active').length,
      );
    else if (
      user?.role === 'faculty' ||
      user?.role === 'admin' ||
      user?.role === 'dean' ||
      user?.role === 'principal'
    )
      failures.push(
        assignmentResult.reason instanceof ApiError
          ? assignmentResult.reason.message
          : 'Review assignments could not be loaded.',
      );
    setErrors(failures);
    setLoading(false);
  }, [session?.token, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const mySubmissionCount = myPapers.filter(
    (paper) =>
      paper.submittedBy === user?._id ||
      (typeof paper.submittedBy === 'object' && paper.submittedBy._id === user?._id),
  ).length;
  const createHref = user?.role === 'student' ? researchPaths.submit : researchPaths.submit;

  return (
    <div className="research-page">
      <ResearchNavigation active="overview" />
      <ResearchPageHeading
        title="Research and Development"
        description="Explore published work, follow research workflows, and find collaborators across your institution."
        action={
          <Link className="button button-primary" to={createHref}>
            <FilePlus2 size={16} /> {user?.role === 'student' ? 'Submit research' : 'Add research'}
          </Link>
        }
      />
      {errors.map((message, index) => (
        <ResearchError key={`${index}-${message}`} message={message} onRetry={() => void load()} />
      ))}
      <section className="research-stats" aria-label="Research overview statistics">
        <Card className="research-stat">
          <span>
            <LibraryBig size={18} />
          </span>
          <small>Published records</small>
          <strong>{loading ? '—' : publicationTotal}</strong>
          <Link to={researchPaths.publications}>
            Browse papers <ArrowRight size={13} />
          </Link>
        </Card>
        <Card className="research-stat">
          <span>
            <Handshake size={18} />
          </span>
          <small>Open collaborations</small>
          <strong>{loading ? '—' : collaborationTotal}</strong>
          <Link to={researchPaths.collaborations}>
            Find a team <ArrowRight size={13} />
          </Link>
        </Card>
        <Card className="research-stat">
          <span>
            <FlaskConical size={18} />
          </span>
          <small>My submissions</small>
          <strong>{loading ? '—' : mySubmissionCount}</strong>
          <Link to={researchPaths.mine}>
            View my research <ArrowRight size={13} />
          </Link>
        </Card>
        {(user?.role === 'faculty' || user?.responsibilities?.includes('rnd_staff')) && (
          <Card className="research-stat">
            <span>
              <ClipboardCheck size={18} />
            </span>
            <small>R&amp;D assignments</small>
            <strong>{loading ? '—' : reviewCount}</strong>
            <Link to={researchPaths.reviews}>
              Review work <ArrowRight size={13} />
            </Link>
          </Card>
        )}
      </section>

      <section className="research-panel">
        <div className="research-panel-heading">
          <div>
            <span className="eyebrow">RECENTLY PUBLISHED</span>
            <h2>Research publications</h2>
          </div>
          <Link to={researchPaths.publications}>
            Browse publications <ArrowRight size={14} />
          </Link>
        </div>
        {loading && papers.length === 0 ? (
          <ResearchLoading label="Loading publications…" />
        ) : papers.length ? (
          <div className="research-publication-list">
            {papers.slice(0, 4).map((paper) => (
              <PublicationCard
                key={paper._id}
                paper={paper}
                dataset={paper.publicationType === 'Dataset'}
              />
            ))}
          </div>
        ) : (
          <ResearchEmpty
            title="No published research yet"
            description="Published papers and datasets will appear here when available."
          />
        )}
      </section>

      <section className="research-panel">
        <div className="research-panel-heading">
          <div>
            <span className="eyebrow">OPEN TO COLLABORATORS</span>
            <h2>Research collaborations</h2>
          </div>
          <Link to={researchPaths.collaborations}>
            View all collaborations <ArrowRight size={14} />
          </Link>
        </div>
        {loading && collaborations.length === 0 ? (
          <ResearchLoading label="Loading collaborations…" />
        ) : collaborations.length ? (
          <div className="research-collaboration-grid">
            {collaborations.slice(0, 3).map((collaboration) => (
              <Card className="research-collaboration-card" key={collaboration._id}>
                <div className="research-publication-tags">
                  <ResearchStatusBadge status={collaboration.status} />
                  <span>{collaboration.subject}</span>
                </div>
                <h3>
                  <Link
                    to={`${researchPaths.collaborations}/${encodeURIComponent(collaboration._id)}`}
                  >
                    {collaboration.title}
                  </Link>
                </h3>
                <p>{collaboration.description}</p>
                <small>
                  {collaboration.openRoles.reduce(
                    (sum, role) => sum + Math.max(0, role.vacancies - role.filled),
                    0,
                  )}{' '}
                  listed openings
                </small>
                <Link
                  to={`${researchPaths.collaborations}/${encodeURIComponent(collaboration._id)}`}
                  className="research-inline-link"
                >
                  Explore project <ArrowRight size={14} />
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          <ResearchEmpty
            title="No open collaborations"
            description="There are no open research projects in the available records."
          />
        )}
      </section>
      <footer className="research-note">
        <FlaskConical size={15} /> Publication and collaboration totals are returned by the research
        API. Funding and grant programs are not exposed by the current backend.
      </footer>
    </div>
  );
}
