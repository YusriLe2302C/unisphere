import { API_BASE_URL, apiRequest, handleUnauthorizedResponse } from '../api';
import { uploadFile } from '../api/upload';

export interface PlacementOpportunity {
  _id: string;
  title: string;
  organization: string;
  institution?: string;
  type: string;
  location: string;
  description: string;
  requirements: string[];
  requiredSkills: string[];
  applicationQuestions: string[];
  deadline?: string;
  applicationDeadline?: string;
  isPlacementDrive: boolean;
  companyDetails?: { website?: string; description?: string; contactEmail?: string };
  minimumCgpa?: number;
  eligibleBranches: string[];
  eligibleBatches: string[];
  requiresResume: boolean;
  package?: string;
  isActive: boolean;
  postedBy?: { _id: string; name: string; avatar?: string; role?: string } | string;
  createdAt?: string;
}

export interface PlacementApplication {
  _id: string;
  applicant: string;
  opportunity: PlacementOpportunity | string;
  roleApplied: string;
  answers: { question: string; answer: string }[];
  status: string;
  note?: string;
  resumeLink?: string;
  resumeFileId?: string;
  reviewerNotes?: string;
  interviewRounds: { name: string; scheduledAt?: string; status: string; notes?: string }[];
  selectionStatus: string;
  offerStatus: string;
  history: { _id?: string; status: string; changedBy: string; note?: string; changedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface PlacementAnnouncement {
  _id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
  author?: { name: string } | string;
}

export async function getPlacementOpportunities(
  institution: string,
  filters: { search?: string; type?: string; location?: string } = {},
) {
  return apiRequest<{ opportunities: PlacementOpportunity[] }>('opportunities', {
    query: { institution, isPlacementDrive: true, ...filters },
  });
}

export async function getMyPlacementApplications(token: string) {
  return apiRequest<{ applications: PlacementApplication[] }>('applications/my', { token });
}

export async function submitPlacementApplication(
  token: string,
  input: {
    opportunityId: string;
    roleApplied: string;
    answers: { question: string; answer: string }[];
    note?: string;
    resumeLink?: string;
    resumeFileId?: string;
    idempotencyKey: string;
  },
) {
  return apiRequest<{ message: string; application: PlacementApplication }>('applications', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function getPlacementApplicationHistory(token: string, id: string) {
  return apiRequest<{
    history: PlacementApplication['history'];
    interviewRounds: PlacementApplication['interviewRounds'];
    selectionStatus: string;
    offerStatus: string;
  }>(`applications/${encodeURIComponent(id)}/history`, { token });
}

export async function withdrawPlacementApplication(token: string, id: string) {
  return apiRequest<{ message: string }>(`applications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}

export async function getPlacementAnnouncements(token: string) {
  return apiRequest<{ announcements: PlacementAnnouncement[]; total: number }>('announcements', {
    token,
    query: { page: 1, limit: 50 },
  });
}

export async function uploadPlacementResume(file: File, token: string) {
  return uploadFile<{ file: { _id: string; originalFileName: string } }>(
    file,
    { associatedEntityType: 'placement_document', accessPolicy: 'private' },
    token,
  ).then((response) => response.file);
}

export async function deletePlacementFile(token: string, id: string) {
  return apiRequest<{ deleted: boolean }>(`files/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}

export async function downloadPlacementFile(token: string, id: string, filename: string) {
  const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  handleUnauthorizedResponse(response);
  if (!response.ok) {
    let message = `Resume download failed (${response.status}).`;
    try {
      message = ((await response.json()) as { message?: string }).message ?? message;
    } catch {
      // Binary and empty error bodies have no JSON message.
    }
    throw new Error(message);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
