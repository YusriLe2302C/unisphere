import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  ArrowRight,
  ExternalLink,
  MapPin,
  Send,
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, FileUpload, Input, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  deletePlacementFile,
  getMyPlacementApplications,
  getPlacementOpportunities,
  submitPlacementApplication,
  uploadPlacementResume,
  type PlacementApplication,
  type PlacementOpportunity,
} from '../../services/placements/placement-api';
import {
  PlacementEmpty,
  PlacementError,
  PlacementHeading,
  PlacementLoading,
  PlacementStatus,
} from './placement-components';
import { placementPaths } from './placement-paths';
import './placements.css';

export function PlacementOpportunityDetailsPage() {
  const { opportunityId } = useParams();
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const [opportunities, setOpportunities] = useState<PlacementOpportunity[]>([]);
  const [applications, setApplications] = useState<PlacementApplication[]>([]);
  const [applicationQuestions, setApplicationQuestions] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [resumeLink, setResumeLink] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!user?.institution || !session?.token) return;
    setLoading(true);
    setError('');
    const [drives, apps] = await Promise.allSettled([
      getPlacementOpportunities(user.institution),
      getMyPlacementApplications(session.token),
    ]);
    if (drives.status === 'fulfilled') setOpportunities(drives.value.opportunities);
    else
      setError(
        drives.reason instanceof ApiError
          ? drives.reason.message
          : 'Placement drive details could not be loaded.',
      );
    if (apps.status === 'fulfilled') setApplications(apps.value.applications);
    else
      setError(
        apps.reason instanceof ApiError
          ? apps.reason.message
          : 'Your applications could not be loaded.',
      );
    setLoading(false);
  }, [user?.institution, session?.token]);
  useEffect(() => {
    void load();
  }, [load]);
  const opportunity = opportunities.find((item) => item._id === opportunityId);
  const application = applications.find(
    (item) =>
      (typeof item.opportunity === 'string' ? item.opportunity : item.opportunity._id) ===
      opportunityId,
  );
  const activeApplication = application && application.status !== 'withdrawn';
  const deadline = opportunity?.applicationDeadline || opportunity?.deadline;
  const closed = Boolean(
    !opportunity?.isActive || (deadline && new Date(deadline).getTime() < Date.now()),
  );
  const apply = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.token || !opportunity) return;
    setSubmitting(true);
    setError('');
    let uploaded: { _id: string; originalFileName: string } | undefined;
    try {
      if (resumeFile) uploaded = await uploadPlacementResume(resumeFile, session.token);
      const result = await submitPlacementApplication(session.token, {
        opportunityId: opportunity._id,
        roleApplied: opportunity.title,
        answers: (opportunity.applicationQuestions || []).map((question) => ({
          question,
          answer: applicationQuestions[question] || '',
        })),
        note: note.trim(),
        resumeLink: resumeLink.trim() || undefined,
        resumeFileId: uploaded?._id,
        idempotencyKey: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${opportunity._id}`,
      });
      await load();
      navigate(`${placementPaths.applications}/${result.application._id}`, {
        state: { confirmation: result.message || 'Application submitted successfully.' },
      });
    } catch (e) {
      if (uploaded?._id && session?.token)
        await deletePlacementFile(session.token, uploaded._id).catch(() => undefined);
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Application could not be submitted. The server is the source of eligibility decisions.',
      );
    } finally {
      setSubmitting(false);
    }
  };
  const companyDetails = opportunity?.companyDetails;
  const requirementList = useMemo(() => opportunity?.requirements || [], [opportunity]);
  return (
    <div className="placement-page">
      <Link to={placementPaths.opportunities} className="placement-back">
        <ArrowLeft size={15} /> Placement opportunities
      </Link>
      {error && <PlacementError message={error} onRetry={() => void load()} />}
      {loading ? (
        <PlacementLoading />
      ) : !opportunity ? (
        <PlacementEmpty
          title="Placement drive details unavailable"
          description="The drive may no longer be active or available in your institution placement search."
          action={
            <Link className="button button-secondary" to={placementPaths.opportunities}>
              Return to placement drives
            </Link>
          }
        />
      ) : (
        <>
          <PlacementHeading title={opportunity.organization} description={opportunity.title} />
          <div className="placement-detail-grid">
            <div className="placement-detail-main">
              <Card className="placement-detail-card">
                <div className="placement-company-title">
                  <span className="placement-company-icon">
                    <Building2 size={22} />
                  </span>
                  <div>
                    <span className="eyebrow">{opportunity.type}</span>
                    <h2>{opportunity.title}</h2>
                    <p>{opportunity.organization}</p>
                  </div>
                </div>
                <p className="placement-description">{opportunity.description}</p>
                <div className="placement-fact-grid">
                  <div>
                    <MapPin size={15} />
                    <span>{opportunity.location || 'Location not listed'}</span>
                  </div>
                  {deadline && (
                    <div>
                      <CalendarClock size={15} />
                      <span>Application deadline: {new Date(deadline).toLocaleString()}</span>
                    </div>
                  )}
                  {opportunity.package && (
                    <div>
                      <span className="placement-fact-label">Package</span>
                      <span>{opportunity.package}</span>
                    </div>
                  )}
                  {companyDetails?.contactEmail && (
                    <div>
                      <span className="placement-fact-label">Contact</span>
                      <a href={`mailto:${companyDetails.contactEmail}`}>
                        {companyDetails.contactEmail}
                      </a>
                    </div>
                  )}
                  {companyDetails?.website && (
                    <div>
                      <ExternalLink size={15} />
                      <a href={companyDetails.website} target="_blank" rel="noreferrer">
                        Company website
                      </a>
                    </div>
                  )}
                </div>
                {companyDetails?.description && (
                  <>
                    <h3>Company information</h3>
                    <p className="placement-description">{companyDetails.description}</p>
                  </>
                )}
              </Card>
              <Card className="placement-detail-card">
                <div className="placement-section-head">
                  <div>
                    <span className="eyebrow">DRIVE INFORMATION</span>
                    <h2>Eligibility and requirements</h2>
                  </div>
                </div>
                <p className="placement-eligibility-note">
                  The placement service determines application eligibility. The details below are
                  the requirements currently returned for this drive.
                </p>
                <div className="placement-eligibility-list">
                  {opportunity.minimumCgpa !== undefined && (
                    <article>
                      <strong>Minimum CGPA</strong>
                      <span>{opportunity.minimumCgpa}</span>
                    </article>
                  )}
                  {opportunity.eligibleBatches?.length > 0 && (
                    <article>
                      <strong>Eligible academic years / batches</strong>
                      <div className="placement-chip-list">
                        {opportunity.eligibleBatches.map((item) => (
                          <Badge key={item} variant="outline">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </article>
                  )}
                  {opportunity.eligibleBranches?.length > 0 && (
                    <article>
                      <strong>Eligible branches / departments</strong>
                      <div className="placement-chip-list">
                        {opportunity.eligibleBranches.map((item) => (
                          <Badge key={item} variant="outline">
                            {item === 'all' ? 'All listed branches' : item}
                          </Badge>
                        ))}
                      </div>
                    </article>
                  )}
                  {opportunity.requiresResume && (
                    <article>
                      <strong>Resume</strong>
                      <Badge variant="warning">Required</Badge>
                    </article>
                  )}
                  {requirementList.map((item, index) => (
                    <article key={`${index}-${item}`}>
                      <strong>Requirement</strong>
                      <span>{item}</span>
                    </article>
                  ))}
                  {opportunity.requiredSkills?.length > 0 && (
                    <article>
                      <strong>Required skills</strong>
                      <div className="placement-chip-list">
                        {opportunity.requiredSkills.map((skill) => (
                          <Badge key={skill} variant="brand">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </article>
                  )}
                  {opportunity.minimumCgpa === undefined &&
                    opportunity.eligibleBatches?.length === 0 &&
                    opportunity.eligibleBranches?.length === 0 &&
                    !requirementList.length &&
                    !opportunity.requiredSkills?.length &&
                    !opportunity.requiresResume && (
                      <p className="placement-muted">
                        No additional eligibility details are listed for this drive.
                      </p>
                    )}
                </div>
                <p className="placement-unsupported-note">
                  Semester, backlog rules, and recruitment stages are not included in this drive
                  record.
                </p>
              </Card>
              {opportunity.applicationQuestions?.length > 0 && (
                <Card className="placement-detail-card">
                  <span className="eyebrow">APPLICATION</span>
                  <h2>Application questions</h2>
                  <div className="placement-questions">
                    {opportunity.applicationQuestions.map((question, index) => (
                      <p key={`${index}-${question}`}>{question}</p>
                    ))}
                  </div>
                </Card>
              )}
            </div>
            <aside className="placement-detail-aside">
              <Card className="placement-apply-card">
                <div>
                  <span className="eyebrow">APPLICATION STATUS</span>
                  {activeApplication ? (
                    <>
                      <h2>Your application</h2>
                      <PlacementStatus status={application.status} />
                      <p>
                        {application.status === 'withdrawn'
                          ? 'You withdrew this application. You can submit a new application while the drive is open.'
                          : 'You have already applied to this placement drive.'}
                      </p>
                      <Link
                        className="button button-secondary"
                        to={`${placementPaths.applications}/${application._id}`}
                      >
                        View application <ArrowRight size={14} />
                      </Link>
                    </>
                  ) : application ? (
                    <>
                      <h2>Previous application</h2>
                      <PlacementStatus status={application.status} />
                      <p>
                        You withdrew this application. A new submission will reactivate it while the
                        drive is open.
                      </p>
                      <Link
                        className="button button-secondary"
                        to={`${placementPaths.applications}/${application._id}`}
                      >
                        View application <ArrowRight size={14} />
                      </Link>
                    </>
                  ) : (
                    <>
                      <h2>{closed ? 'Applications closed' : 'Apply for this drive'}</h2>
                      <p>
                        {deadline
                          ? `Deadline ${new Date(deadline).toLocaleDateString()}`
                          : 'Review drive requirements before applying.'}
                      </p>
                    </>
                  )}
                </div>
                {!activeApplication && user?.role === 'student' && !closed && (
                  <form className="placement-application-form" onSubmit={apply}>
                    {opportunity.applicationQuestions?.map((question) => (
                      <label key={question}>
                        {question}
                        <Textarea
                          value={applicationQuestions[question] || ''}
                          onChange={(event) =>
                            setApplicationQuestions((current) => ({
                              ...current,
                              [question]: event.target.value,
                            }))
                          }
                          rows={2}
                          required
                        />
                      </label>
                    ))}
                    <label>
                      Note to the placement team{' '}
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Optional"
                      />
                    </label>
                    <div className="placement-resume-upload">
                      <strong>
                        {opportunity.requiresResume ? 'Resume required' : 'Resume (optional)'}
                      </strong>
                      <FileUpload
                        accept=".pdf,.doc,.docx"
                        label={resumeFile ? resumeFile.name : 'Choose a resume'}
                        helperText="Private placement document · PDF, DOC, or DOCX"
                        onFilesSelected={(files) => setResumeFile(files[0] || null)}
                        onError={setError}
                      />
                      {resumeFile && (
                        <button
                          className="placement-clear-file"
                          type="button"
                          onClick={() => setResumeFile(null)}
                        >
                          Remove selected file
                        </button>
                      )}
                      <Input
                        value={resumeLink}
                        onChange={(e) => setResumeLink(e.target.value)}
                        placeholder="Or paste a resume link"
                        aria-label="Resume link"
                        type="url"
                      />
                    </div>
                    <Button
                      type="submit"
                      loading={submitting}
                      disabled={opportunity.requiresResume && !resumeFile && !resumeLink.trim()}
                      leadingIcon={<Send size={15} />}
                    >
                      Submit application
                    </Button>
                    <small>
                      Eligibility, duplicate applications, and the final status are verified by the
                      placement service.
                    </small>
                  </form>
                )}
                {user?.role !== 'student' && (
                  <p className="placement-muted">Applications are submitted by student accounts.</p>
                )}
              </Card>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
