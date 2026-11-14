import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, FilePlus2, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, FileUpload, Input, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  deleteResearchFile,
  getResearchPaper,
  createResearchPaper,
  updateRejectedPaper,
  uploadResearchFile,
  type PublicationType,
  type ResearchFileRecord,
  type ResearchPaper,
} from '../../services/research/research-api';
import { ResearchError, ResearchNavigation, ResearchPageHeading } from './research-components';
import { researchPaths } from './research-paths';
import './research.css';

const publicationTypes: PublicationType[] = [
  'Journal Paper',
  'Conference Proceeding',
  'Conference Paper',
  'Preprint',
  'Patent',
  'Dataset',
  'Technical Report',
];

export function ResearchSubmissionPage() {
  const { session, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const editId = new URLSearchParams(location.search).get('edit');
  const [title, setTitle] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [authorsText, setAuthorsText] = useState('');
  const [subject, setSubject] = useState('');
  const [publicationType, setPublicationType] = useState<PublicationType>('Preprint');
  const [doi, setDoi] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [datasetUrl, setDatasetUrl] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'institution-only'>('public');
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(Boolean(editId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingRecord, setExistingRecord] = useState<ResearchPaper | null>(null);

  const load = useCallback(async () => {
    if (!session?.token) return;
    if (editId) {
      setLoadingRecord(true);
      try {
        const record = await getResearchPaper(session.token, editId);
        const owner =
          typeof record.submittedBy === 'string' ? record.submittedBy : record.submittedBy._id;
        if (
          owner !== user?._id ||
          !record.isStudentSubmission ||
          record.lifecycleStatus !== 'rejected'
        )
          throw new Error('Only your rejected student submission can be edited here.');
        setExistingRecord(record);
        setTitle(record.title);
        setAbstractText(record.abstract);
        setSubject(record.subject);
        setPublicationType(record.publicationType);
        setDoi(record.doi ?? '');
        setExternalUrl(record.externalUrl ?? '');
        setDatasetUrl(record.datasetUrl ?? '');
        setTagsText(record.tags.join(', '));
      } catch (reason) {
        setError(
          reason instanceof ApiError
            ? reason.message
            : reason instanceof Error
              ? reason.message
              : 'Submission could not be loaded.',
        );
      } finally {
        setLoadingRecord(false);
      }
    }
  }, [session?.token, user?._id, editId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    const tags = tagsText
      .split(',')
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean);
    if (editId && existingRecord) {
      try {
        const result = await updateRejectedPaper(session.token, existingRecord._id, {
          title: title.trim(),
          abstract: abstractText.trim(),
          subject: subject.trim(),
          publicationType,
          doi,
          externalUrl,
          datasetUrl,
          tags,
        });
        setExistingRecord(result.paper);
        setSuccess('Submission details saved. Publish the updated version from its workflow page when ready.');
      } catch (reason) {
        setError(
          reason instanceof ApiError ? reason.message : 'Submission changes could not be saved.',
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const uploaded: ResearchFileRecord[] = [];
    try {
      let fileAttachmentId: string | undefined;
      let datasetFileId: string | undefined;
      if (paperFile) {
        const result = await uploadResearchFile(paperFile, 'research_paper', session.token);
        uploaded.push(result);
        fileAttachmentId = result._id;
      }
      if (datasetFile) {
        const result = await uploadResearchFile(datasetFile, 'research_dataset', session.token);
        uploaded.push(result);
        datasetFileId = result._id;
      }
      const result = await createResearchPaper(session.token, {
        title: title.trim(),
        abstract: abstractText.trim(),
        subject: subject.trim(),
        publicationType,
        ...(authorsText.trim() && {
          authors: authorsText
            .split('\n')
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => ({ name })),
        }),
        ...(doi.trim() && { doi: doi.trim() }),
        ...(externalUrl.trim() && { externalUrl: externalUrl.trim() }),
        ...(datasetUrl.trim() && { datasetUrl: datasetUrl.trim() }),
        ...(tags.length > 0 && { tags }),
        visibility: user?.role === 'student' ? 'institution-only' : visibility,
        ...(fileAttachmentId && { fileAttachmentId }),
        ...(datasetFileId && { datasetFileId }),
      });
      setSuccess(result.message);
      navigate(`/app/research/papers/${encodeURIComponent(result.paper._id)}`, {
        replace: true,
        state: { message: result.message },
      });
    } catch (reason) {
      await Promise.all(
        uploaded.map((file) => deleteResearchFile(session.token!, file._id).catch(() => undefined)),
      );
      setError(
        reason instanceof ApiError ? reason.message : 'Research submission could not be created.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingRecord)
    return (
      <div className="research-page">
        <ResearchNavigation active="mine" />
        <div className="research-loading">Loading submission…</div>
      </div>
    );
  const isStudent = user?.role === 'student';

  return (
    <div className="research-page">
      <ResearchNavigation active={editId ? 'mine' : 'submit'} />
      <Link to={researchPaths.mine} className="research-back-link">
        <ArrowLeft size={14} /> My research
      </Link>
      <ResearchPageHeading
        eyebrow={editId ? 'UPDATE SUBMISSION' : 'RESEARCH SUBMISSION'}
        title={
          editId
            ? 'Edit rejected submission'
            : isStudent
              ? 'Submit student research'
              : 'Create research publication'
        }
        description={
          isStudent
            ? 'Publish your research directly to your institution without reviewer approval.'
            : 'Add a publication or dataset using the research publication record supported by UniSphere.'
        }
      />
      {error && <ResearchError message={error} />}
      {success && (
        <p className="research-action-success" role="status">
          {success}
        </p>
      )}
      {isStudent && !editId && (
        <div className="research-workflow-notice" role="status">
          <strong>No review required</strong>
          <span>Your publication will be visible to members of your institution.</span>
        </div>
      )}
      <form className="research-form research-panel" onSubmit={submit}>
        <div className="research-form-grid">
          <label className="research-field research-field-full">
            Title
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={250}
            />
          </label>
          <label className="research-field">
            Publication type
            <select
              value={publicationType}
              onChange={(event) => setPublicationType(event.target.value as PublicationType)}
            >
              {publicationTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="research-field">
            Subject
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} required />
          </label>
          <label className="research-field research-field-full">
            Abstract
            <Textarea
              value={abstractText}
              onChange={(event) => setAbstractText(event.target.value)}
              required
              rows={7}
            />
          </label>
          <label className="research-field research-field-full">
            Authors{' '}
            <small>
              One author name per line. Leave blank to use the authenticated author account.
            </small>
            <Textarea
              value={authorsText}
              onChange={(event) => setAuthorsText(event.target.value)}
              rows={3}
              placeholder="Author names"
            />
          </label>
          <label className="research-field">
            DOI
            <Input
              value={doi}
              onChange={(event) => setDoi(event.target.value)}
              placeholder="10.…"
            />
          </label>
          <label className="research-field">
            External publication URL
            <Input
              type="url"
              value={externalUrl}
              onChange={(event) => setExternalUrl(event.target.value)}
              placeholder="https://…"
            />
          </label>
          <label className="research-field">
            Dataset access URL
            <Input
              type="url"
              value={datasetUrl}
              onChange={(event) => setDatasetUrl(event.target.value)}
              placeholder="https://…"
            />
          </label>
          <label className="research-field">
            Tags <small>Comma-separated</small>
            <Input value={tagsText} onChange={(event) => setTagsText(event.target.value)} />
          </label>
          {!isStudent && !editId && (
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
          )}
        </div>
        {!editId && (
          <div className="research-upload-grid">
            <section>
              <h2>
                Paper attachment <small>Optional · PDF · max 15 MB</small>
              </h2>
              {paperFile ? (
                <div className="research-selected-file">
                  <span>
                    <FilePlus2 size={16} />
                    {paperFile.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove paper attachment"
                    onClick={() => setPaperFile(null)}
                  >
                    <X size={15} />
                  </Button>
                </div>
              ) : (
                <FileUpload
                  accept="application/pdf,.pdf"
                  disabled={submitting}
                  label="Attach paper PDF"
                  helperText="A clean institutional attachment will be linked to the record."
                  onFilesSelected={(files) => setPaperFile(files[0] ?? null)}
                  onError={setError}
                />
              )}
            </section>
            <section>
              <h2>
                Dataset attachment <small>Optional · CSV, ZIP, PDF · max 15 MB</small>
              </h2>
              {datasetFile ? (
                <div className="research-selected-file">
                  <span>
                    <FilePlus2 size={16} />
                    {datasetFile.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove dataset attachment"
                    onClick={() => setDatasetFile(null)}
                  >
                    <X size={15} />
                  </Button>
                </div>
              ) : (
                <FileUpload
                  accept="text/csv,.csv,application/zip,.zip,application/pdf,.pdf"
                  disabled={submitting}
                  label="Attach dataset"
                  helperText="Uploaded through the backend's research dataset file type."
                  onFilesSelected={(files) => setDatasetFile(files[0] ?? null)}
                  onError={setError}
                />
              )}
            </section>
          </div>
        )}
        {existingRecord && (
          <p className="research-muted">
            Existing attachments remain linked. The current backend metadata update does not accept
            replacement attachment IDs.
          </p>
        )}
        <div className="research-form-actions">
          <Button type="submit" leadingIcon={<FilePlus2 size={16} />} loading={submitting}>
            {editId
              ? 'Save submission details'
              : isStudent
                ? 'Publish to institution'
                : 'Create publication'}
          </Button>
          <Link className="button button-secondary" to={researchPaths.mine}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
