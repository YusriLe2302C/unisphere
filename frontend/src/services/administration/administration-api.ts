import { apiRequest } from '../api';

export interface ManagedUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  institution: string;
  department?: string;
  isActive: boolean;
  isVerified: boolean;
  disciplinaryStatus?: string;
  responsibilities?: string[];
  avatar?: string;
  createdAt?: string;
  graduationYear?: number;
  batch?: string;
  semester?: number;
  headline?: string;
  skills?: string[];
  alumniProfile?: Record<string, unknown>;
}
export interface ReportRecord {
  _id: string;
  targetType: 'post' | 'user' | 'community';
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  reporter?: { _id: string; name: string; email: string; institution: string; role: string };
}
export interface AuditEntry {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  createdAt?: string;
  timestamp?: string;
  actor?: { name?: string; role?: string };
}

export function getAdminStats(token: string) {
  return apiRequest<{
    stats: {
      totalUsers: number;
      totalPosts: number;
      totalCommunities: number;
      totalOpportunities: number;
      pendingReports: number;
      rolesBreakdown: { _id: string; count: number }[];
      responsibilitiesBreakdown: { _id: string; count: number }[];
      institutionsBreakdown: { _id: string; count: number }[];
    };
  }>('admin/stats', { token });
}
export function getInstitutionStats(token: string, institution?: string) {
  return apiRequest<{
    institution: string;
    analytics: {
      users: number;
      posts: number;
      communities: number;
      opportunities: number;
      researchPapers: number;
      events: number;
      pendingReports: number;
    };
  }>('admin/institution/stats', { token, query: { institution } });
}
export function getManagedUsers(
  token: string,
  filters: {
    role?: string;
    isActive?: string;
    institution?: string;
    page?: number;
    limit?: number;
  },
) {
  return apiRequest<{ users: ManagedUser[]; total: number; page: number; limit: number }>(
    'admin/users',
    { token, query: filters },
  );
}
export function setUserVerification(token: string, id: string, isVerified: boolean, reason = '') {
  return apiRequest<{ message: string; user: ManagedUser }>(
    `admin/users/${encodeURIComponent(id)}/verify`,
    { method: 'PUT', token, body: { isVerified, reason } },
  );
}
export function setUserStatus(token: string, id: string, isActive: boolean, reason = '') {
  return apiRequest<{ user: ManagedUser }>(`admin/users/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    token,
    body: { isActive, reason },
  });
}
export function setUserRole(token: string, id: string, role: string, reason = '') {
  return apiRequest<{ user: ManagedUser }>(`admin/users/${encodeURIComponent(id)}/role`, {
    method: 'PUT',
    token,
    body: { role, reason },
  });
}
export function setUserResponsibilities(
  token: string,
  id: string,
  responsibilities: string[],
  reason = '',
) {
  return apiRequest<{ user: ManagedUser }>(
    `admin/users/${encodeURIComponent(id)}/responsibilities`,
    { method: 'PUT', token, body: { responsibilities, reason } },
  );
}
export function setUserDisciplinaryStatus(
  token: string,
  id: string,
  status: string,
  reason: string,
) {
  return apiRequest<{ user: ManagedUser }>(`admin/users/${encodeURIComponent(id)}/disciplinary`, {
    method: 'POST',
    token,
    body: { status, reason },
  });
}
export function getReports(token: string) {
  return apiRequest<{ reports: ReportRecord[] }>('admin/reports', { token });
}
export function updateReport(
  token: string,
  id: string,
  status: 'resolved' | 'dismissed',
  reason = '',
) {
  return apiRequest<{ message: string; report: ReportRecord }>(
    `admin/reports/${encodeURIComponent(id)}`,
    { method: 'PUT', token, body: { status, reason } },
  );
}
export function getAuditEntries(token: string, limit = 50) {
  return apiRequest<{ entries: AuditEntry[] }>('admin/audit', { token, query: { limit } });
}
