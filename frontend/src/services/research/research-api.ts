import { apiRequest, API_BASE_URL, handleUnauthorizedResponse } from '../api';
import { uploadFile } from '../api/upload';

export type PublicationType =
  | 'Journal Paper'
  | 'Conference Proceeding'
  | 'Conference Paper'
  | 'Preprint'
  | 'Patent'
  | 'Dataset'
  | 'Technical Report';
export type ResearchStatus =
  | 'draft'
  | 'submitted'
  | 'pending_proctor'
  | 'pending_guide'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'archived';
export type ReviewVerdict = 'approved' | 'changes_requested' | 'rejected';
export type ReviewerRole = 'proctor' | 'project_guide';

export interface ResearchPerson {
  _id: string;
  name: string;
  email?: string;
  avatar?: string;
  institution?: string;
  department?: string;
  role?: string;
  headline?: string;
  skills?: string[];
  interests?: string[];
}

export interface ResearchAuthor {
  name: string;
  user?: string | ResearchPerson;
  institution?: string;
  email?: string;
}

export interface ResearchPaper {
  _id: string;
  title: string;
  abstract: string;
  authors: ResearchAuthor[];
  publicationType: PublicationType;
  subject: string;
  department?: string;
  collegeId?: string;
  doi?: string;
  externalUrl?: string;
  pdfUrl?: string;
  fileAttachmentId?: string;
  datasetFileId?: string;
  datasetUrl?: string;
  publicationDate: string;
  tags: string[];
  institution: string;
  visibility: 'public' | 'institution-only';
  submittedBy: string | ResearchPerson;
  isStudentSubmission?: boolean;
  lifecycleStatus?: ResearchStatus;
  collaborationId?: string;
  assignedProctorId?: string;
  assignedProjectGuideId?: string;
  assignedProjectGuideIds?: string[];
  revisionRound?: number;
  reviewHistory?: { revisionRound: number; submittedAt: string; submittedBy: string }[];
  citations?: number;
  downloadCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResearchReview {
  _id: string;
  paperId: string;
  reviewerId: string | ResearchPerson;
  reviewerRole: ReviewerRole;
  verdict: ReviewVerdict;
  comments: string;
  criteriaScores?: {
    novelty?: number;
    methodology?: number;
    clarity?: number;
    ethicalCompliance?: boolean;
  };
  reviewedAt: string;
  revisionRound: number;
}

export interface ResearchAssignment {
  _id: string;
  student: string | ResearchPerson;
  faculty: string | ResearchPerson;
  assignmentType: ReviewerRole;
  collaborationId?: string;
  department?: string;
  institution: string;
  status: string;
  assignedAt: string;
  terminatedAt?: string;
}

export interface CollaborationRole {
  _id?: string;
  roleTitle: string;
  description: string;
  vacancies: number;
  filled: number;
}

export interface CollaborationApplication {
  _id: string;
  applicant: string | (ResearchPerson & { graduationYear?: number });
  roleSought: string;
  statement: string;
  relevantSkills: string[];
  interests: string[];
  portfolioUrl?: string;
  status: 'pending' | 'applied' | 'shortlisted' | 'accepted' | 'declined' | 'withdrawn';
  reviewerNotes?: string;
  appliedAt: string;
  reviewedAt?: string;
}

export interface ResearchCollaboration {
  _id: string;
  title: string;
  description: string;
  leadResearcher: string | ResearchPerson;
  supervisor?: string | ResearchPerson;
  institution: string;
  department: string;
  subject: string;
  requiredSkills: string[];
  openRoles: CollaborationRole[];
  teamMembers: { user: string | ResearchPerson; role: string; joinedAt?: string }[];
  applications?: CollaborationApplication[];
  visibility: 'public' | 'institution-only';
  status: 'open' | 'in_progress' | 'completed' | 'closed';
  tags: string[];
  externalLinks: { title: string; url: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ResearchFilters {
  search?: string;
  subject?: string;
  publicationType?: string;
  page?: number;
  limit?: number;
}

export interface CollaborationFilters {
  search?: string;
  subject?: string;
  status?: string;
  skill?: string;
  tags?: string;
  page?: number;
  limit?: number;
}

export interface ResearchFileRecord {
  _id: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  associatedEntityType: string;
  accessPolicy: string;
}

export async function getResearchPapers(token: string | undefined, filters: ResearchFilters = {}) {
  return apiRequest<{ papers: ResearchPaper[]; total: number; page: number; pages: number }>(
    'research',
    {
      token,
      query: {
        ...filters,
        subject: filters.subject === 'All' ? undefined : filters.subject,
        publicationType: filters.publicationType === 'All' ? undefined : filters.publicationType,
      },
    },
  );
}

export async function getResearchPaper(token: string, id: string) {
  const result = await apiRequest<{ paper: ResearchPaper }>(`research/${encodeURIComponent(id)}`, {
    token,
  });
  return result.paper;
}

export async function getMyResearchPapers(token: string) {
  const result = await apiRequest<{ papers: ResearchPaper[] }>('research/papers/mine', { token });
  return result.papers;
}

export async function createResearchPaper(
  token: string,
  input: {
    title: string;
    abstract: string;
    authors?: ResearchAuthor[];
    publicationType: PublicationType;
    subject: string;
    doi?: string;
    externalUrl?: string;
    pdfUrl?: string;
    datasetUrl?: string;
    tags?: string[];
    visibility?: 'public' | 'institution-only';
    fileAttachmentId?: string;
    datasetFileId?: string;
  },
) {
  return apiRequest<{ message: string; paper: ResearchPaper }>('research', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function updateRejectedPaper(
  token: string,
  id: string,
  input: Partial<
    Pick<
      ResearchPaper,
      | 'title'
      | 'abstract'
      | 'authors'
      | 'publicationType'
      | 'subject'
      | 'doi'
      | 'externalUrl'
      | 'pdfUrl'
      | 'datasetUrl'
      | 'tags'
      | 'visibility'
    >
  >,
) {
  return apiRequest<{ message: string; paper: ResearchPaper }>(
    `research/${encodeURIComponent(id)}`,
    { method: 'PUT', token, body: input },
  );
}

export async function resubmitResearchPaper(token: string, id: string) {
  return apiRequest<{ paper: ResearchPaper; revisionRound: number }>(
    `research/papers/${encodeURIComponent(id)}/resubmit`,
    { method: 'POST', token, body: {} },
  );
}

export async function getPaperReviews(token: string, id: string) {
  const result = await apiRequest<{ reviews: ResearchReview[] }>(
    `research/papers/${encodeURIComponent(id)}/reviews`,
    { token },
  );
  return result.reviews;
}

export async function submitPaperReview(
  token: string,
  id: string,
  input: {
    verdict: ReviewVerdict;
    comments: string;
    criteriaScores?: ResearchReview['criteriaScores'];
  },
) {
  return apiRequest<{ review: ResearchReview; paper: ResearchPaper }>(
    `research/papers/${encodeURIComponent(id)}/reviews`,
    { method: 'POST', token, body: input },
  );
}

export async function publishResearchPaper(
  token: string,
  id: string,
  visibility: 'public' | 'institution-only',
) {
  return apiRequest<{ paper: ResearchPaper }>(`research/papers/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    token,
    body: { visibility },
  });
}

export async function getResearchAssignments(token: string) {
  const result = await apiRequest<{ assignments: ResearchAssignment[] }>('research/assignments', {
    token,
  });
  return result.assignments;
}

export async function getCollaborations(
  token: string | undefined,
  filters: CollaborationFilters = {},
) {
  return apiRequest<{
    collaborations: ResearchCollaboration[];
    total: number;
    page: number;
    pages: number;
  }>('research/collaborations', { token, query: { ...filters } });
}

export async function getCollaboration(token: string, id: string) {
  const result = await apiRequest<{ collaboration: ResearchCollaboration }>(
    `research/collaborations/${encodeURIComponent(id)}`,
    { token },
  );
  return result.collaboration;
}

export async function createCollaboration(
  token: string,
  input: {
    title: string;
    description: string;
    subject: string;
    department?: string;
    requiredSkills?: string[];
    openRoles?: CollaborationRole[];
    visibility?: 'public' | 'institution-only';
    tags?: string[];
    externalLinks?: { title: string; url: string }[];
    supervisor?: string;
  },
) {
  return apiRequest<{ message: string; collaboration: ResearchCollaboration }>(
    'research/collaborations',
    { method: 'POST', token, body: input },
  );
}

export async function applyToCollaboration(
  token: string,
  id: string,
  input: {
    roleSought: string;
    statement: string;
    relevantSkills?: string[];
    interests?: string[];
    portfolioUrl?: string;
  },
) {
  return apiRequest<{ message: string; application: CollaborationApplication }>(
    `research/collaborations/${encodeURIComponent(id)}/apply`,
    { method: 'POST', token, body: input },
  );
}

export async function getMyCollaborationRequests(token: string) {
  return apiRequest<{
    requests: Array<
      CollaborationApplication & {
        collaborationId: string;
        projectTitle: string;
        subject: string;
        institution: string;
        projectStatus: string;
        leadResearcher: ResearchPerson;
        supervisor?: ResearchPerson;
      }
    >;
    total: number;
  }>('research/collaborations/my-requests', { token });
}

export async function reviewCollaborationApplication(
  token: string,
  id: string,
  applicationId: string,
  input: {
    status: 'shortlisted' | 'accepted' | 'declined';
    reviewerNotes?: string;
  },
) {
  return apiRequest<{
    collaboration: ResearchCollaboration;
    application: CollaborationApplication;
  }>(
    `research/collaborations/${encodeURIComponent(id)}/applications/${encodeURIComponent(applicationId)}/review`,
    { method: 'POST', token, body: input },
  );
}

export async function withdrawCollaborationApplication(
  token: string,
  id: string,
  applicationId: string,
) {
  return apiRequest<{ message: string; application: CollaborationApplication }>(
    `research/collaborations/${encodeURIComponent(id)}/applications/${encodeURIComponent(applicationId)}/withdraw`,
    { method: 'PUT', token, body: {} },
  );
}

export async function uploadResearchFile(
  file: File,
  type: 'research_paper' | 'research_dataset',
  token: string,
) {
  return uploadFile<{ file: ResearchFileRecord }>(
    file,
    { associatedEntityType: type, accessPolicy: 'institutional' },
    token,
  ).then((response) => response.file);
}

export async function deleteResearchFile(token: string, id: string) {
  return apiRequest<{ deleted: boolean }>(`files/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}

export async function downloadResearchFile(id: string, token: string, filename: string) {
  const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  handleUnauthorizedResponse(response);
  if (!response.ok) {
    let message = `File download failed (${response.status}).`;
    try {
      message = ((await response.json()) as { message?: string }).message ?? message;
    } catch {
      /* response is not JSON */
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
