import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Handshake, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Input, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  applyToCollaboration,
  getCollaboration,
  reviewCollaborationApplication,
  type CollaborationApplication,
  type ResearchCollaboration,
} from '../../services/research/research-api';
import {
  ResearchError,
  ResearchLoading,
  ResearchNavigation,
  ResearchPageHeading,
  ResearchStatusBadge,
} from './research-components';
import { researchPaths } from './research-paths';
import './research.css';

function idOf(value: string | { _id: string } | undefined) {
  return typeof value === 'string' ? value : value?._id;
}
function personName(value: string | { name: string } | undefined) {
  return typeof value === 'object' && value ? value.name : '';
}

export function CollaborationDetailsPage() {
  const { collaborationId = '' } = useParams();
  const { session, user } = useAuth();
  const [project, setProject] = useState<ResearchCollaboration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [roleSought, setRoleSought] = useState('');
  const [statement, setStatement] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [reviewingApplication, setReviewingApplication] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!session?.token || !collaborationId) return;
    setLoading(true);
    setError('');
    try {
      setProject(await getCollaboration(session.token, collaborationId));
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : 'Project details could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token, collaborationId]);
  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <ResearchLoading label="Loading collaboration…" />;
  if (error || !project)
    return (
      <div className="research-page">
        <ResearchNavigation active="collaborations" />
        <ResearchError message={error || 'Project not found.'} onRetry={() => void load()} />
        <Link to={researchPaths.collaborations} className="research-inline-link">
          <ArrowLeft size={14} /> Collaborations
        </Link>
      </div>
    );

  const userId = user?._id ?? '';
  const isLeadOrSupervisor =
    idOf(project.leadResearcher) === userId || idOf(project.supervisor) === userId;
  const canReview = Boolean(
    isLeadOrSupervisor || ['admin', 'dean', 'principal', 'superadmin'].includes(user?.role ?? ''),
  );
  const isMember = project.teamMembers.some((member) => idOf(member.user) === userId);
  const ownApplication = (project.applications ?? []).find(
    (application) =>
      idOf(application.applicant) === userId &&
      ['pending', 'applied', 'shortlisted', 'accepted'].includes(application.status),
  );
  const openRoles = project.openRoles.filter((role) => role.vacancies > role.filled);

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token || !project) return;
    setBusy(true);
    setActionError('');
    setMessage('');
    try {
      const result = await applyToCollaboration(session.token, project._id, {
        roleSought,
        statement: statement.trim(),
        relevantSkills: skills
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        interests: interests
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        ...(portfolioUrl.trim() && { portfolioUrl: portfolioUrl.trim() }),
      });
      setMessage(result.message);
      await load();
    } catch (reason) {
      setActionError(
        reason instanceof ApiError
          ? reason.message
          : 'Your collaboration request could not be submitted.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function reviewApplication(
    application: CollaborationApplication,
    status: 'shortlisted' | 'accepted' | 'declined',
  ) {
    if (!session?.token || !project) return;
    setReviewingApplication(application._id);
    setActionError('');
    setMessage('');
    try {
      await reviewCollaborationApplication(session.token, project._id, application._id, {
        status,
        reviewerNotes: reviewerNotes[application._id] ?? '',
      });
      setMessage(`Application marked ${status}.`);
      await load();
    } catch (reason) {
      setActionError(
        reason instanceof ApiError ? reason.message : 'Application review could not be saved.',
      );
    } finally {
      setReviewingApplication('');
    }
  }

  return (
    <div className="research-page">
      <ResearchNavigation active="collaborations" />
      <Link to={researchPaths.collaborations} className="research-back-link">
        <ArrowLeft size={14} /> All collaborations
      </Link>
      <ResearchPageHeading
        eyebrow={`RESEARCH PROJECT · ${project.subject}`}
        title={project.title}
        description={`${project.institution} · ${project.department}`}
        action={<ResearchStatusBadge status={project.status} />}
      />
      {(actionError || message) && (
        <p
          className={actionError ? 'research-action-error' : 'research-action-success'}
          role={actionError ? 'alert' : 'status'}
        >
          {actionError || message}
        </p>
      )}
      <div className="research-collaboration-detail-grid">
        <div className="research-detail-column">
          <Card className="research-panel">
            <div className="research-panel-heading">
              <div>
                <span className="eyebrow">PROJECT OVERVIEW</span>
                <h2>About this collaboration</h2>
              </div>
              <Handshake size={19} />
            </div>
            <p className="research-detail-abstract">{project.description}</p>
            <div className="research-collaboration-tags">
              {project.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            {project.requiredSkills.length > 0 && (
              <div className="research-detail-section">
                <h3>Requested skills</h3>
                <div className="research-collaboration-tags">
                  {project.requiredSkills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </div>
            )}
            {project.externalLinks.map((link) => (
              <a
                className="research-inline-link"
                href={link.url}
                target="_blank"
                rel="noreferrer"
                key={`${link.title}-${link.url}`}
              >
                {link.title} <ExternalLink size={13} />
              </a>
            ))}
          </Card>
          <Card className="research-panel">
            <div className="research-panel-heading">
              <div>
                <span className="eyebrow">RESEARCH TEAM</span>
                <h2>Project members</h2>
              </div>
              <Users size={18} />
            </div>
            <div className="research-team-list">
              {project.teamMembers.map((member, index) => (
                <div key={`${idOf(member.user)}-${index}`}>
                  <strong>{personName(member.user) || 'Institution researcher'}</strong>
                  <small>{member.role}</small>
                </div>
              ))}
            </div>
            {personName(project.leadResearcher) && (
              <p className="research-muted">
                Project lead: {personName(project.leadResearcher)}
                {personName(project.supervisor)
                  ? ` · Supervisor: ${personName(project.supervisor)}`
                  : ''}
              </p>
            )}
          </Card>
          {canReview && (
            <Card className="research-panel">
              <div className="research-panel-heading">
                <div>
                  <span className="eyebrow">APPLICANT REVIEW</span>
                  <h2>Collaboration requests</h2>
                </div>
              </div>
              {project.applications?.length ? (
                <div className="research-application-list">
                  {project.applications.map((application) => (
                    <article key={application._id}>
                      <header>
                        <div>
                          <strong>{personName(application.applicant) || 'Applicant'}</strong>
                          <small>
                            {application.roleSought} ·{' '}
                            {new Date(application.appliedAt).toLocaleDateString()}
                          </small>
                        </div>
                        <ResearchStatusBadge status={application.status} />
                      </header>
                      <p>{application.statement}</p>
                      {application.relevantSkills.length > 0 && (
                        <small>Skills: {application.relevantSkills.join(', ')}</small>
                      )}
                      {application.reviewerNotes && (
                        <p className="research-reviewer-note">
                          Your notes: {application.reviewerNotes}
                        </p>
                      )}
                      {['pending', 'applied', 'shortlisted'].includes(application.status) && (
                        <div className="research-application-actions">
                          <label>
                            Reviewer notes
                            <Textarea
                              value={
                                reviewerNotes[application._id] ?? application.reviewerNotes ?? ''
                              }
                              onChange={(event) =>
                                setReviewerNotes((current) => ({
                                  ...current,
                                  [application._id]: event.target.value,
                                }))
                              }
                              rows={2}
                            />
                          </label>
                          {(['shortlisted', 'accepted', 'declined'] as const).map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={status === 'declined' ? 'outline' : 'primary'}
                              loading={reviewingApplication === application._id}
                              disabled={Boolean(
                                reviewingApplication && reviewingApplication !== application._id,
                              )}
                              onClick={() => void reviewApplication(application, status)}
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="research-muted">
                  No applications have been returned for this project.
                </p>
              )}
            </Card>
          )}
        </div>
        <aside className="research-collaboration-aside">
          <Card className="research-panel">
            <div className="research-panel-heading">
              <div>
                <span className="eyebrow">OPEN ROLES</span>
                <h2>Join the project</h2>
              </div>
            </div>
            {openRoles.length ? (
              <div className="research-open-roles">
                {openRoles.map((role) => (
                  <div key={role._id ?? role.roleTitle}>
                    <strong>{role.roleTitle}</strong>
                    <small>{role.description}</small>
                    <span>
                      {role.vacancies - role.filled} position
                      {role.vacancies - role.filled === 1 ? '' : 's'} available
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="research-muted">No open roles are listed.</p>
            )}
            {project.status === 'open' && !isMember && !ownApplication && openRoles.length > 0 && (
              <form className="research-form" onSubmit={submitApplication}>
                <label className="research-field">
                  Role
                  <select
                    value={roleSought}
                    onChange={(event) => setRoleSought(event.target.value)}
                    required
                  >
                    <option value="">Select an open role</option>
                    {openRoles.map((role) => (
                      <option value={role.roleTitle} key={role._id ?? role.roleTitle}>
                        {role.roleTitle}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="research-field">
                  Statement
                  <Textarea
                    value={statement}
                    onChange={(event) => setStatement(event.target.value)}
                    rows={4}
                    required
                    maxLength={4000}
                  />
                </label>
                <label className="research-field">
                  Relevant skills{' '}
                  <Input
                    value={skills}
                    onChange={(event) => setSkills(event.target.value)}
                    placeholder="Comma-separated"
                  />
                </label>
                <label className="research-field">
                  Research interests{' '}
                  <Input
                    value={interests}
                    onChange={(event) => setInterests(event.target.value)}
                    placeholder="Comma-separated"
                  />
                </label>
                <label className="research-field">
                  Portfolio URL{' '}
                  <Input
                    type="url"
                    value={portfolioUrl}
                    onChange={(event) => setPortfolioUrl(event.target.value)}
                  />
                </label>
                <Button type="submit" loading={busy} trailingIcon={<ArrowRight size={15} />}>
                  Apply to join
                </Button>
              </form>
            )}
            {ownApplication && (
              <div className="research-existing-request">
                <ResearchStatusBadge status={ownApplication.status} />
                <p>Your request for {ownApplication.roleSought} has been submitted.</p>
                {ownApplication.reviewerNotes && (
                  <small>Reviewer notes: {ownApplication.reviewerNotes}</small>
                )}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
