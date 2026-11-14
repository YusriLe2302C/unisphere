import { apiRequest } from '../api';

export interface FacultyAnnouncement {
  _id: string;
  title: string;
  content: string;
  institution: string;
  targetAudience: 'all' | 'students' | 'faculty' | 'alumni';
  targetRoles: string[];
  targetDepartments: string[];
  targetAcademicYears: string[];
  targetSemesters: number[];
  targetSections: string[];
  category: string;
  isPinned: boolean;
  expiresAt?: string;
  createdAt: string;
  author:
    string | { _id: string; name: string; avatar?: string; role?: string; department?: string };
}

export interface FacultyNotification {
  _id: string;
  type: string;
  message: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
  sender?: string | { _id: string; name: string; avatar?: string; role?: string };
}

export async function getFacultyAnnouncements(
  token: string,
  page = 1,
  filters: { category?: string; institution?: string } = {},
) {
  return apiRequest<{
    announcements: FacultyAnnouncement[];
    total: number;
    page: number;
    pages: number;
  }>('announcements', { token, query: { page, limit: 50, ...filters } });
}

export async function getFacultyAnnouncement(token: string, id: string) {
  return apiRequest<{ announcement: FacultyAnnouncement }>(
    `announcements/${encodeURIComponent(id)}`,
    { token },
  );
}

export async function createFacultyAnnouncement(
  token: string,
  input: Pick<
    FacultyAnnouncement,
    | 'title'
    | 'content'
    | 'targetAudience'
    | 'targetRoles'
    | 'targetDepartments'
    | 'targetAcademicYears'
    | 'targetSemesters'
    | 'targetSections'
    | 'category'
    | 'isPinned'
  > & { institution?: string; expiresAt?: string },
) {
  return apiRequest<{ message: string; announcement: FacultyAnnouncement }>('announcements', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function updateFacultyAnnouncement(
  token: string,
  id: string,
  input: Partial<
    Pick<
      FacultyAnnouncement,
      | 'title'
      | 'content'
      | 'targetAudience'
      | 'targetRoles'
      | 'targetDepartments'
      | 'targetAcademicYears'
      | 'targetSemesters'
      | 'targetSections'
      | 'category'
      | 'isPinned'
    >
  > & { expiresAt?: string },
) {
  return apiRequest<{ message: string; announcement: FacultyAnnouncement }>(
    `announcements/${encodeURIComponent(id)}`,
    { method: 'PUT', token, body: input },
  );
}

export async function getFacultyNotifications(token: string) {
  return apiRequest<{
    notifications: FacultyNotification[];
    unreadCount: number;
    pagination: { page: number; limit: number; total: number; pages: number };
  }>('notifications', { token, query: { page: 1, limit: 6 } });
}
