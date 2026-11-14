import { apiRequest } from '../api';
import type { AuthUser } from '../../types/auth';

export interface SearchPerson extends Pick<
  AuthUser,
  '_id' | 'name' | 'role' | 'institution' | 'avatar' | 'headline'
> {
  department?: string;
  skills?: string[];
  email?: string;
  phone?: string;
  privacySettings?: AuthUser['privacySettings'];
}

export async function searchPeople(
  token: string,
  input: { q: string; institution?: string; page?: number; limit?: number },
) {
  return apiRequest<{ users: SearchPerson[]; total: number }>('users', { token, query: input });
}

export async function updateMyProfile(
  token: string,
  input: Partial<
    Pick<
      AuthUser,
      | 'name'
      | 'headline'
      | 'bio'
      | 'department'
      | 'graduationYear'
      | 'skills'
      | 'interests'
      | 'avatar'
      | 'privacySettings'
      | 'notificationPreferences'
      | 'batch'
      | 'semester'
      | 'section'
      | 'cgpa'
      | 'degree'
    >
  >,
) {
  return apiRequest<{ message: string; user: AuthUser }>('users/profile/me', {
    method: 'PUT',
    token,
    body: input,
  });
}

export async function getPublicProfile(token: string, id: string) {
  return apiRequest<{ user: SearchPerson & Partial<AuthUser>; stats?: Record<string, number> }>(
    `users/${encodeURIComponent(id)}`,
    { token },
  );
}
