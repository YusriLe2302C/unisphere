import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Megaphone, Pencil, Send, X } from 'lucide-react';
import { Badge, Button, Card, Input, Select, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  createFacultyAnnouncement,
  getFacultyAnnouncements,
  updateFacultyAnnouncement,
  type FacultyAnnouncement,
} from '../../services/faculty/faculty-api';
import { FacultyEmpty, FacultyError, FacultyHeading, FacultyLoading } from './faculty-components';
import './faculty.css';

interface AnnouncementDraft {
  title: string;
  content: string;
  targetAudience: 'all' | 'students' | 'faculty' | 'alumni';
  targetRoles: string;
  targetDepartments: string;
  targetAcademicYears: string;
  targetSemesters: string;
  targetSections: string;
  category: string;
  isPinned: boolean;
  expiresAt: string;
}
const blank: AnnouncementDraft = {
  title: '',
  content: '',
  targetAudience: 'all',
  targetRoles: '',
  targetDepartments: '',
  targetAcademicYears: '',
  targetSemesters: '',
  targetSections: '',
  category: 'General',
  isPinned: false,
  expiresAt: '',
};
const split = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
function draftFrom(record: FacultyAnnouncement): AnnouncementDraft {
  return {
    title: record.title,
    content: record.content,
    targetAudience: record.targetAudience,
    targetRoles: record.targetRoles.join(', '),
    targetDepartments: record.targetDepartments.join(', '),
    targetAcademicYears: record.targetAcademicYears.join(', '),
    targetSemesters: record.targetSemesters.join(', '),
    targetSections: record.targetSections.join(', '),
    category: record.category,
    isPinned: record.isPinned,
    expiresAt: record.expiresAt ? new Date(record.expiresAt).toISOString().slice(0, 16) : '',
  };
}

export function FacultyAnnouncementsPage() {
  const { session, user } = useAuth();
  const canPublish = ['admin', 'superadmin', 'principal', 'dean', 'faculty'].includes(
    user?.role || '',
  );
  const [records, setRecords] = useState<FacultyAnnouncement[]>([]);
  const [draft, setDraft] = useState(blank);
  const [targetInstitution, setTargetInstitution] = useState('');
  const [editing, setEditing] = useState<FacultyAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      setRecords((await getFacultyAnnouncements(session.token)).announcements);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Announcements could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.token]);
  useEffect(() => {
    void load();
  }, [load]);
  function values() {
    return {
      title: draft.title.trim(),
      content: draft.content.trim(),
      ...(user?.role === 'admin' || user?.role === 'superadmin'
        ? { institution: targetInstitution.trim() || undefined }
        : {}),
      targetAudience: draft.targetAudience,
      targetRoles: split(draft.targetRoles),
      targetDepartments: split(draft.targetDepartments),
      targetAcademicYears: split(draft.targetAcademicYears),
      targetSemesters: split(draft.targetSemesters).map(Number).filter(Number.isInteger),
      targetSections: split(draft.targetSections),
      category: draft.category.trim() || 'General',
      isPinned: draft.isPinned,
      expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : undefined,
    };
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session?.token || !canPublish) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (editing) {
        const result = await updateFacultyAnnouncement(session.token, editing._id, values());
        setRecords((current) =>
          current.map((record) => (record._id === editing._id ? result.announcement : record)),
        );
        setNotice(result.message || 'Announcement updated.');
      } else {
        const result = await createFacultyAnnouncement(session.token, values());
        setRecords((current) => [
          result.announcement,
          ...current.filter((record) => record._id !== result.announcement._id),
        ]);
        setNotice(result.message || 'Announcement published.');
      }
      setEditing(null);
      setDraft(blank);
      setTargetInstitution('');
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Announcement could not be saved. The backend will validate your role and targeting.',
      );
    } finally {
      setBusy(false);
    }
  }
  function edit(record: FacultyAnnouncement) {
    setEditing(record);
    setDraft(draftFrom(record));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  return (
    <div className="faculty-page">
      <FacultyHeading
        title="Announcements"
        workspaceLabel={`${user?.role?.toUpperCase() || 'CAMPUS'} WORKSPACE`}
        description={
          canPublish
            ? 'Create institution announcements with audience and academic targeting.'
            : 'Announcements shared with your account will appear here.'
        }
      />
      <div
        className={`faculty-announcement-layout ${canPublish ? '' : 'faculty-announcement-layout--reader'}`}
      >
        <Card className={`faculty-form-card ${canPublish ? '' : 'faculty-form-card--hidden'}`}>
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">
                {editing ? 'EDIT ANNOUNCEMENT' : 'PUBLISH ANNOUNCEMENT'}
              </span>
              <h2>{editing ? 'Update your announcement' : 'New announcement'}</h2>
            </div>
            {editing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  setDraft(blank);
                }}
                leadingIcon={<X size={15} />}
              >
                Cancel edit
              </Button>
            )}
          </header>
          {user?.role !== 'faculty' && (
            <p className="faculty-permission-note">
              Announcement publication requires a role and target institution accepted by the
              announcement API. You are signed in as {user?.role}.
            </p>
          )}
          <form className="faculty-announcement-form" onSubmit={submit}>
            {(user?.role === 'admin' || user?.role === 'superadmin') && !editing && (
              <label>
                Institution (optional)
                <Input
                  value={targetInstitution}
                  onChange={(event) => setTargetInstitution(event.target.value)}
                  placeholder="Leave blank to send across all institutions"
                />
                <small>
                  Leave blank for a platform-wide announcement, or enter one institution.
                </small>
              </label>
            )}
            <label>
              Title
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                required
                maxLength={180}
              />
            </label>
            <label>
              Announcement content
              <Textarea
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                rows={6}
                required
                maxLength={10000}
              />
            </label>
            <div className="faculty-form-row">
              <label>
                Target audience
                <Select
                  value={draft.targetAudience}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      targetAudience: e.target.value as AnnouncementDraft['targetAudience'],
                    })
                  }
                >
                  <option value="all">All audiences</option>
                  <option value="students">Students</option>
                  <option value="faculty">Faculty</option>
                  <option value="alumni">Alumni</option>
                </Select>
              </label>
              <label>
                Category
                <Input
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="General"
                />
              </label>
            </div>
            <label>
              Target departments
              <Input
                value={draft.targetDepartments}
                onChange={(e) => setDraft({ ...draft, targetDepartments: e.target.value })}
                placeholder="Comma-separated department values"
              />
              <small>Matches the backend’s targetDepartments field.</small>
            </label>
            <label>
              Target roles
              <Input
                value={draft.targetRoles}
                onChange={(e) => setDraft({ ...draft, targetRoles: e.target.value })}
                placeholder="Comma-separated backend role values"
              />
            </label>
            <div className="faculty-form-row">
              <label>
                Academic years / batches
                <Input
                  value={draft.targetAcademicYears}
                  onChange={(e) => setDraft({ ...draft, targetAcademicYears: e.target.value })}
                  placeholder="e.g. batch values, comma-separated"
                />
              </label>
              <label>
                Semesters
                <Input
                  value={draft.targetSemesters}
                  onChange={(e) => setDraft({ ...draft, targetSemesters: e.target.value })}
                  placeholder="Comma-separated numbers"
                  inputMode="numeric"
                />
              </label>
            </div>
            <div className="faculty-form-row">
              <label>
                Sections
                <Input
                  value={draft.targetSections}
                  onChange={(e) => setDraft({ ...draft, targetSections: e.target.value })}
                  placeholder="Comma-separated section values"
                />
              </label>
              <label>
                Expiry date (optional)
                <Input
                  type="datetime-local"
                  value={draft.expiresAt}
                  onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
                />
              </label>
            </div>
            <label className="faculty-checkbox">
              <input
                type="checkbox"
                checked={draft.isPinned}
                onChange={(e) => setDraft({ ...draft, isPinned: e.target.checked })}
              />{' '}
              Pin announcement
            </label>
            {error && <FacultyError message={error} />}
            <Button type="submit" loading={busy} leadingIcon={<Send size={15} />}>
              {editing ? 'Save changes' : 'Publish announcement'}
            </Button>
            <small>
              Publishing and any permission errors are returned by the existing announcement API.
            </small>
          </form>
        </Card>
        <section className="faculty-panel">
          <header className="faculty-panel-head">
            <div>
              <span className="eyebrow">AVAILABLE TO YOUR ACCOUNT</span>
              <h2>Announcements</h2>
            </div>
            <Badge variant="outline">{records.length} loaded</Badge>
          </header>
          {notice && (
            <p className="faculty-success" role="status">
              {notice}
            </p>
          )}
          {error && !records.length && <FacultyError message={error} retry={() => void load()} />}
          {loading ? (
            <FacultyLoading />
          ) : records.length ? (
            <div className="faculty-announcement-cards">
              {records.map((record) => {
                const isAuthor =
                  typeof record.author === 'object'
                    ? record.author._id === user?._id
                    : record.author === user?._id;
                return (
                  <Card className="faculty-announcement-card" key={record._id}>
                    <div className="faculty-announcement-card-top">
                      <Badge variant="brand" size="sm">
                        {record.category}
                      </Badge>
                      <Badge variant="success" size="sm">
                        Published
                      </Badge>
                      {record.isPinned && (
                        <Badge variant="warning" size="sm">
                          Pinned
                        </Badge>
                      )}
                      {(isAuthor || user?.role === 'admin' || user?.role === 'superadmin') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => edit(record)}
                          leadingIcon={<Pencil size={14} />}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                    <h3>{record.title}</h3>
                    <p className="faculty-announcement-content">{record.content}</p>
                    <details>
                      <summary>Announcement details</summary>
                      <dl>
                        <div>
                          <dt>Audience</dt>
                          <dd>{record.targetAudience}</dd>
                        </div>
                        {record.targetDepartments.length > 0 && (
                          <div>
                            <dt>Departments</dt>
                            <dd>{record.targetDepartments.join(', ')}</dd>
                          </div>
                        )}
                        {record.targetRoles.length > 0 && (
                          <div>
                            <dt>Roles</dt>
                            <dd>{record.targetRoles.join(', ')}</dd>
                          </div>
                        )}
                        {record.targetAcademicYears.length > 0 && (
                          <div>
                            <dt>Academic years / batches</dt>
                            <dd>{record.targetAcademicYears.join(', ')}</dd>
                          </div>
                        )}
                        {record.targetSemesters.length > 0 && (
                          <div>
                            <dt>Semesters</dt>
                            <dd>{record.targetSemesters.join(', ')}</dd>
                          </div>
                        )}
                        {record.targetSections.length > 0 && (
                          <div>
                            <dt>Sections</dt>
                            <dd>{record.targetSections.join(', ')}</dd>
                          </div>
                        )}
                        {record.expiresAt && (
                          <div>
                            <dt>Expires</dt>
                            <dd>{new Date(record.expiresAt).toLocaleString()}</dd>
                          </div>
                        )}
                      </dl>
                    </details>
                    <footer>
                      <Megaphone size={14} />
                      <span>
                        {new Date(record.createdAt).toLocaleString()} ·{' '}
                        {typeof record.author === 'object'
                          ? record.author.name
                          : 'Announcement author'}
                      </span>
                    </footer>
                  </Card>
                );
              })}
            </div>
          ) : (
            <FacultyEmpty
              title="No announcements available"
              description="Announcements visible to your account will appear here."
            />
          )}
        </section>
      </div>
    </div>
  );
}
