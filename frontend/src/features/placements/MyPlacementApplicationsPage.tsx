import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ClipboardList, Download } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  downloadPlacementFile,
  getMyPlacementApplications,
  getPlacementApplicationHistory,
  withdrawPlacementApplication,
  type PlacementApplication,
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

export function MyPlacementApplicationsPage() {
  const { session } = useAuth();
  const [applications, setApplications] = useState<PlacementApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      setApplications((await getMyPlacementApplications(session.token)).applications);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Applications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.token]);
  useEffect(() => {
    void load();
  }, [load]);
  async function withdraw(application: PlacementApplication) {
    if (!session?.token) return;
    setBusy(application._id);
    setError('');
    try {
      const result = await withdrawPlacementApplication(session.token, application._id);
      setNotice(result.message);
      setConfirm('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Application could not be withdrawn.');
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="placement-page">
      <PlacementHeading
        title="My placement applications"
        description="Review submitted applications, status history, and interview schedules."
        action={
          <Link className="button button-secondary" to={placementPaths.opportunities}>
            <ClipboardList size={15} /> Browse drives
          </Link>
        }
      />
      {notice && (
        <p className="placement-success" role="status">
          {notice}
        </p>
      )}
      {error && <PlacementError message={error} onRetry={() => void load()} />}
      {loading ? (
        <PlacementLoading />
      ) : applications.length ? (
        <div className="placement-application-table-wrap">
          <table className="placement-application-table">
            <caption className="us-sr-only">Your placement application records</caption>
            <thead>
              <tr>
                <th>Company and role</th>
                <th>Applied</th>
                <th>Application status</th>
                <th>Selection status</th>
                <th>Interview rounds</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => {
                const opportunity =
                  typeof application.opportunity === 'string' ? undefined : application.opportunity;
                return (
                  <tr key={application._id}>
                    <td>
                      <strong>{opportunity?.organization || 'Placement company'}</strong>
                      <small>{opportunity?.title || application.roleApplied}</small>
                    </td>
                    <td>{new Date(application.createdAt).toLocaleDateString()}</td>
                    <td>
                      <PlacementStatus status={application.status} />
                    </td>
                    <td>
                      <Badge
                        variant={
                          application.selectionStatus === 'selected'
                            ? 'success'
                            : application.selectionStatus === 'not_selected'
                              ? 'critical'
                              : 'outline'
                        }
                        size="sm"
                      >
                        {(application.selectionStatus || 'pending').replaceAll('_', ' ')}
                      </Badge>
                    </td>
                    <td>{application.interviewRounds.length}</td>
                    <td>
                      <div className="placement-table-actions">
                        <Link
                          to={`${placementPaths.applications}/${application._id}`}
                          className="placement-text-link"
                        >
                          Details <ArrowRight size={14} />
                        </Link>
                        {application.status !== 'withdrawn' && confirm !== application._id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirm(application._id)}
                          >
                            Withdraw
                          </Button>
                        )}
                        {confirm === application._id && (
                          <>
                            <Button
                              size="sm"
                              variant="danger"
                              loading={busy === application._id}
                              onClick={() => void withdraw(application)}
                            >
                              Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirm('')}>
                              Keep
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Card className="placement-panel">
          <PlacementEmpty
            title="No placement applications"
            description="Once you apply to a placement drive, your application and status history will appear here."
            action={
              <Link className="button button-primary" to={placementPaths.opportunities}>
                Explore placement drives
              </Link>
            }
          />
        </Card>
      )}
    </div>
  );
}

export function PlacementApplicationDetailsPage() {
  const { applicationId } = useParams();
  const location = useLocation();
  const confirmation = (location.state as { confirmation?: string } | null)?.confirmation;
  const { session } = useAuth();
  const [application, setApplication] = useState<PlacementApplication | null>(null);
  const [history, setHistory] = useState<PlacementApplication['history']>([]);
  const [rounds, setRounds] = useState<PlacementApplication['interviewRounds']>([]);
  const [selection, setSelection] = useState('pending');
  const [offer, setOffer] = useState('not_issued');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token || !applicationId) return;
    setLoading(true);
    setError('');
    try {
      const own = await getMyPlacementApplications(session.token);
      const found = own.applications.find((item) => item._id === applicationId);
      if (!found) throw new Error('This application is not available in your account.');
      setApplication(found);
      const details = await getPlacementApplicationHistory(session.token, applicationId);
      setHistory(details.history);
      setRounds(details.interviewRounds);
      setSelection(details.selectionStatus);
      setOffer(details.offerStatus);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Application details could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token, applicationId]);
  useEffect(() => {
    void load();
  }, [load]);
  const opportunity =
    application && typeof application.opportunity === 'object'
      ? application.opportunity
      : undefined;
  return (
    <div className="placement-page">
      <Link to={placementPaths.applications} className="placement-back">
        <ArrowRight className="placement-back-icon" size={15} /> My applications
      </Link>
      {confirmation && (
        <p className="placement-success" role="status">
          {confirmation}
        </p>
      )}
      {error && <PlacementError message={error} onRetry={() => void load()} />}
      {loading ? (
        <PlacementLoading />
      ) : application ? (
        <>
          <PlacementHeading
            title={opportunity?.organization || application.roleApplied}
            description={opportunity?.title || 'Placement application details'}
          />
          <div className="placement-detail-grid">
            <div className="placement-detail-main">
              <Card className="placement-detail-card">
                <div className="placement-application-status-head">
                  <div>
                    <span className="eyebrow">APPLICATION STATUS</span>
                    <h2>{application.roleApplied}</h2>
                  </div>
                  <PlacementStatus status={application.status} />
                </div>
                <div className="placement-fact-grid">
                  <div>
                    <span className="placement-fact-label">Applied</span>
                    <span>{new Date(application.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="placement-fact-label">Last updated</span>
                    <span>{new Date(application.updatedAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="placement-fact-label">Selection</span>
                    <PlacementStatus status={selection} />
                  </div>
                  <div>
                    <span className="placement-fact-label">Offer</span>
                    <PlacementStatus status={offer} />
                  </div>
                </div>
                {application.reviewerNotes && (
                  <div className="placement-review-note">
                    <strong>Placement team feedback</strong>
                    <p>{application.reviewerNotes}</p>
                  </div>
                )}
                {application.note && (
                  <div className="placement-review-note">
                    <strong>Your application note</strong>
                    <p>{application.note}</p>
                  </div>
                )}
                {application.answers.length > 0 && (
                  <>
                    <h3>Your application responses</h3>
                    <div className="placement-answer-list">
                      {application.answers.map((answer, index) => (
                        <article key={`${index}-${answer.question}`}>
                          <strong>{answer.question}</strong>
                          <p>{answer.answer}</p>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </Card>
              <Card className="placement-detail-card">
                <span className="eyebrow">APPLICATION HISTORY</span>
                <h2>Status timeline</h2>
                {history.length ? (
                  <ol className="placement-history-list">
                    {[...history]
                      .sort(
                        (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
                      )
                      .map((item, index) => (
                        <li key={item._id || `${item.status}-${item.changedAt}-${index}`}>
                          <span className="placement-timeline-dot" />
                          <div>
                            <PlacementStatus status={item.status} />
                            <small>{new Date(item.changedAt).toLocaleString()}</small>
                            {item.note && <p>{item.note}</p>}
                          </div>
                        </li>
                      ))}
                  </ol>
                ) : (
                  <PlacementEmpty
                    title="No status history returned"
                    description="The backend has not returned history entries for this application."
                  />
                )}
              </Card>
              <Card className="placement-detail-card">
                <span className="eyebrow">INTERVIEWS</span>
                <h2>Interview rounds</h2>
                {rounds.length ? (
                  <div className="placement-interview-list">
                    {rounds.map((round, index) => (
                      <article key={`${round.name}-${index}`}>
                        <span className="placement-timeline-dot" />
                        <div>
                          <strong>{round.name}</strong>
                          <small>
                            {round.scheduledAt
                              ? new Date(round.scheduledAt).toLocaleString()
                              : 'Date not scheduled'}
                          </small>
                          {round.notes && <p>{round.notes}</p>}
                        </div>
                        <PlacementStatus status={round.status} />
                      </article>
                    ))}
                  </div>
                ) : (
                  <PlacementEmpty
                    title="No interview rounds"
                    description="Interview schedules will appear here when provided by the placement service."
                  />
                )}
              </Card>
            </div>
            <aside className="placement-detail-aside">
              {opportunity && (
                <Card className="placement-apply-card">
                  <span className="eyebrow">PLACEMENT DRIVE</span>
                  <h2>{opportunity.organization}</h2>
                  <p>{opportunity.title}</p>
                  <Link
                    className="button button-secondary"
                    to={`${placementPaths.opportunities}/${opportunity._id}`}
                  >
                    View drive details
                  </Link>
                </Card>
              )}
              {application.resumeFileId && (
                <Card className="placement-apply-card">
                  <span className="eyebrow">RESUME</span>
                  <h2>Submitted document</h2>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!session?.token || !application.resumeFileId) return;
                      try {
                        await downloadPlacementFile(
                          session.token,
                          application.resumeFileId,
                          'placement-resume',
                        );
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : 'Resume could not be downloaded.',
                        );
                      }
                    }}
                  >
                    <Download size={15} /> Download resume
                  </Button>
                </Card>
              )}
            </aside>
          </div>
        </>
      ) : (
        <PlacementEmpty
          title="Application not found"
          description="This application is not available for your account."
        />
      )}
    </div>
  );
}
