import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  createCollaboration,
  getMyCollaborationRequests,
  withdrawCollaborationApplication,
  type CollaborationRole,
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

interface RoleDraft {
  roleTitle: string;
  description: string;
  vacancies: number;
}

export function NewCollaborationPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState('');
  const [skills, setSkills] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'institution-only'>('public');
  const [roles, setRoles] = useState<RoleDraft[]>([]);
  const [externalTitle, setExternalTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) return;
    setBusy(true);
    setError('');
    try {
      const result = await createCollaboration(session.token, {
        title: title.trim(),
        description: description.trim(),
        subject: subject.trim(),
        ...(department.trim() && { department: department.trim() }),
        requiredSkills: skills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        openRoles: roles
          .filter((role) => role.roleTitle.trim())
          .map((role) => ({ ...role, filled: 0 }) as CollaborationRole),
        visibility,
        tags: tags
          .split(',')
          .map((item) => item.trim().replace(/^#/, ''))
          .filter(Boolean),
        externalLinks:
          externalTitle.trim() && externalUrl.trim()
            ? [{ title: externalTitle.trim(), url: externalUrl.trim() }]
            : [],
      });
      navigate(`${researchPaths.collaborations}/${encodeURIComponent(result.collaboration._id)}`, {
        replace: true,
      });
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : 'The collaboration could not be created.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="research-page">
      <ResearchNavigation active="collaborations" />
      <Link to={researchPaths.collaborations} className="research-back-link">
        <ArrowLeft size={14} /> Collaborations
      </Link>
      <ResearchPageHeading
        eyebrow="RESEARCH COLLABORATION"
        title="Start a project"
        description="Describe the research question and the expertise you are looking for."
      />
      {error && <ResearchError message={error} />}
      <form className="research-form research-panel" onSubmit={submit}>
        <div className="research-form-grid">
          <label className="research-field research-field-full">
            Project title
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="research-field">
            Research subject
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} required />
          </label>
          <label className="research-field">
            Department
            <Input value={department} onChange={(event) => setDepartment(event.target.value)} />
          </label>
          <label className="research-field research-field-full">
            Project description
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={7}
              required
            />
          </label>
          <label className="research-field">
            Required skills <small>Comma-separated</small>
            <Input value={skills} onChange={(event) => setSkills(event.target.value)} />
          </label>
          <label className="research-field">
            Tags <small>Comma-separated</small>
            <Input value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
          <label className="research-field">
            Visibility
            <select
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as 'public' | 'institution-only')
              }
            >
              <option value="public">Public</option>
              <option value="institution-only">Institution only</option>
            </select>
          </label>
        </div>
        <section className="research-form-section">
          <div className="research-form-section-heading">
            <div>
              <h2>
                Open roles <small>Optional</small>
              </h2>
              <p>Describe the contributor roles and available positions.</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              leadingIcon={<Plus size={14} />}
              onClick={() =>
                setRoles((current) => [
                  ...current,
                  { roleTitle: '', description: '', vacancies: 1 },
                ])
              }
            >
              Add role
            </Button>
          </div>
          {roles.map((role, index) => (
            <div className="research-role-draft" key={index}>
              <label className="research-field">
                Role title
                <Input
                  value={role.roleTitle}
                  onChange={(event) =>
                    setRoles((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, roleTitle: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="research-field">
                Vacancies
                <Input
                  type="number"
                  min="1"
                  value={role.vacancies}
                  onChange={(event) =>
                    setRoles((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, vacancies: Math.max(1, Number(event.target.value)) }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="research-field research-field-full">
                Description
                <Input
                  value={role.description}
                  onChange={(event) =>
                    setRoles((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, description: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove role ${index + 1}`}
                onClick={() =>
                  setRoles((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                <X size={15} /> Remove role
              </Button>
            </div>
          ))}
        </section>
        <div className="research-form-grid">
          <label className="research-field">
            External resource title <small>Optional</small>
            <Input
              value={externalTitle}
              onChange={(event) => setExternalTitle(event.target.value)}
            />
          </label>
          <label className="research-field">
            External resource URL <small>Optional</small>
            <Input
              type="url"
              value={externalUrl}
              onChange={(event) => setExternalUrl(event.target.value)}
            />
          </label>
        </div>
        <div className="research-form-actions">
          <Button type="submit" loading={busy}>
            Create collaboration
          </Button>
          <Link className="button button-secondary" to={researchPaths.collaborations}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

interface RequestRecord {
  _id: string;
  collaborationId: string;
  projectTitle: string;
  subject: string;
  institution: string;
  projectStatus: string;
  roleSought: string;
  statement: string;
  status: string;
  reviewerNotes?: string;
  appliedAt: string;
}

export function MyCollaborationRequestsPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      setItems((await getMyCollaborationRequests(session.token)).requests as RequestRecord[]);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'Your collaboration requests could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token]);
  useEffect(() => {
    void load();
  }, [load]);
  async function withdraw(item: RequestRecord) {
    if (!session?.token) return;
    setBusyId(item._id);
    setError('');
    try {
      await withdrawEvent(session.token, item.collaborationId, item._id);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'The request could not be withdrawn.');
    } finally {
      setBusyId('');
    }
  }
  return (
    <div className="research-page">
      <ResearchNavigation active="collaborations" />
      <Link to={researchPaths.collaborations} className="research-back-link">
        <ArrowLeft size={14} /> Collaborations
      </Link>
      <ResearchPageHeading
        title="My collaboration requests"
        description="Track applications and feedback from research project leads."
      />
      {error && <ResearchError message={error} onRetry={() => void load()} />}
      {loading ? (
        <ResearchLoading />
      ) : items.length ? (
        <div className="research-request-list">
          {items.map((item) => (
            <article key={item._id}>
              <div>
                <div className="research-publication-tags">
                  <ResearchStatusBadge status={item.status} />
                  <span>{item.subject}</span>
                </div>
                <h2>
                  <Link
                    to={`${researchPaths.collaborations}/${encodeURIComponent(item.collaborationId)}`}
                  >
                    {item.projectTitle}
                  </Link>
                </h2>
                <p>
                  Requested role: {item.roleSought} · {item.institution}
                </p>
                <p>{item.statement}</p>
                {item.reviewerNotes && (
                  <p className="research-reviewer-note">Feedback: {item.reviewerNotes}</p>
                )}
              </div>
              {['pending', 'applied', 'shortlisted'].includes(item.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  loading={busyId === item._id}
                  onClick={() => void withdraw(item)}
                >
                  Withdraw
                </Button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <ResearchEmpty
          title="No collaboration requests"
          description="Requests you submit to join research teams will appear here."
        />
      )}
    </div>
  );
}

async function withdrawEvent(token: string, collaborationId: string, applicationId: string) {
  return withdrawCollaborationApplication(token, collaborationId, applicationId);
}
