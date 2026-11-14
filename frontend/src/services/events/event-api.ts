import { apiRequest } from '../api';

export type EventLifecycleStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'ongoing'
  | 'completed'
  | 'cancelled';

export interface CampusEvent {
  _id: string;
  title: string;
  description: string;
  institution: string;
  organizer: string | { _id: string; name?: string };
  status: EventLifecycleStatus;
  mode?: 'in_person' | 'online' | 'hybrid';
  venue?: string;
  onlineMeetingUrl?: string;
  startDate: string;
  endDate: string;
  registrationOpenDate?: string;
  registrationCloseDate?: string;
  audience?: 'all' | 'students' | 'faculty' | 'alumni' | 'institution_only';
  eligibility?: {
    targetInstitutions?: string[];
    targetDepartments?: string[];
    targetBatches?: string[];
    targetSemesters?: number[];
    targetRoles?: string[];
    minCgpa?: number;
    customCriteria?: string;
  };
  rules?: string[];
  capacity?: number;
  allocatedSeats?: number;
  isTeamEvent?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  allowWaitlist?: boolean;
  coordinators?: { userId: string; name: string; role?: string; contactEmail?: string }[];
  sponsors?: { name: string; tier: string; logoUrl?: string; websiteUrl?: string }[];
  flyerUrl?: string;
  files?: { fileType: string; url: string }[];
  schedule?: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    speaker?: string;
    venue?: string;
  }[];
  category?: string;
  tags?: string[];
  createdAt?: string;
  myRegistration?: EventRegistration | null;
}

export interface EventRegistration {
  _id: string;
  eventId?: string;
  status: 'registered' | 'waitlisted' | 'cancelled' | 'attended';
  registeredAt?: string;
  teamName?: string;
  teamMembers?: { userId: string; name: string; email?: string; role?: string }[];
  seatsAllocated?: number;
  ticketCode?: string;
  waitlistPosition?: number;
  cancelledAt?: string;
}

export interface EventListFilters {
  from?: string;
  to?: string;
  limit?: number;
  status?: EventLifecycleStatus;
}

export interface EventRegistrationInput {
  teamName?: string;
  teamMembers?: { userId: string }[];
}

export async function getEvents(
  token: string,
  filters: EventListFilters = {},
): Promise<CampusEvent[]> {
  const result = await apiRequest<{ events: CampusEvent[] }>('events', {
    token,
    query: {
      limit: filters.limit ?? 100,
      from: filters.from,
      to: filters.to,
      status: filters.status,
    },
  });
  return result.events;
}

export type CreateCampusEventInput = Pick<
  CampusEvent,
  'title' | 'description' | 'startDate' | 'endDate'
> &
  Partial<
    Pick<CampusEvent, 'mode' | 'venue' | 'onlineMeetingUrl' | 'audience' | 'flyerUrl' | 'category'>
  >;

export async function createCampusEvent(token: string, input: CreateCampusEventInput) {
  return apiRequest<{ event: CampusEvent }>('events', { method: 'POST', token, body: input });
}

export async function submitCampusEvent(token: string, eventId: string) {
  return apiRequest<{ event: CampusEvent }>(`events/${encodeURIComponent(eventId)}/submit`, {
    method: 'POST',
    token,
    body: {},
  });
}

export async function updateCampusEvent(
  token: string,
  eventId: string,
  input: Partial<CreateCampusEventInput>,
) {
  return apiRequest<{ event: CampusEvent }>(`events/${encodeURIComponent(eventId)}`, {
    method: 'PUT',
    token,
    body: input,
  });
}

export async function publishCampusEvent(token: string, eventId: string) {
  return apiRequest<{ event: CampusEvent }>(`events/${encodeURIComponent(eventId)}/publish`, {
    method: 'POST',
    token,
    body: {},
  });
}

export async function cancelCampusEvent(token: string, eventId: string, reason: string) {
  return apiRequest<{ event: CampusEvent }>(`events/${encodeURIComponent(eventId)}/cancel`, {
    method: 'POST',
    token,
    body: { reason },
  });
}

export async function reviewCampusEvent(
  token: string,
  eventId: string,
  decision: 'approve' | 'reject',
  reason?: string,
) {
  return apiRequest<{ event: CampusEvent }>(`events/${encodeURIComponent(eventId)}/review`, {
    method: 'POST',
    token,
    body: { decision, reason },
  });
}

export interface EventParticipant {
  _id: string;
  status: EventRegistration['status'];
  registeredAt?: string;
  userId: { _id: string; name: string; email: string; department?: string } | string;
}

export async function getEventRegistrations(token: string, eventId: string) {
  return apiRequest<{ registrations: EventParticipant[] }>(
    `events/${encodeURIComponent(eventId)}/registrations`,
    { token },
  );
}

export async function getEvent(token: string, eventId: string): Promise<CampusEvent> {
  const result = await apiRequest<{ event: CampusEvent; myRegistration: EventRegistration | null }>(
    `events/${encodeURIComponent(eventId)}`,
    { token },
  );
  return { ...result.event, myRegistration: result.myRegistration };
}

export async function getCampusEvents(token: string, limit = 12): Promise<CampusEvent[]> {
  return getEvents(token, { limit, from: new Date().toISOString() });
}

export async function registerForEvent(
  token: string,
  eventId: string,
  input: EventRegistrationInput = {},
): Promise<{ registration: EventRegistration; idempotentReplay: boolean }> {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const key = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return apiRequest<{ registration: EventRegistration; idempotentReplay: boolean }>(
    `events/${encodeURIComponent(eventId)}/register`,
    { method: 'POST', token, headers: { 'Idempotency-Key': key }, body: input },
  );
}

export async function cancelEventRegistration(
  token: string,
  eventId: string,
  registrationId: string,
): Promise<{ cancelled: boolean; promotedRegistration: EventRegistration | null }> {
  return apiRequest<{ cancelled: boolean; promotedRegistration: EventRegistration | null }>(
    `events/${encodeURIComponent(eventId)}/register/${encodeURIComponent(registrationId)}`,
    {
      method: 'DELETE',
      token,
      body: {},
    },
  );
}

export async function getMyEventRegistrations(
  token: string,
): Promise<Array<{ event: CampusEvent; registration: EventRegistration }>> {
  const events = await getEvents(token, { limit: 100 });
  const results: Array<{ event: CampusEvent; registration: EventRegistration }> = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(8, events.length) }, async () => {
    while (index < events.length) {
      const event = events[index++];
      if (!event) continue;
      const detailed = await getEvent(token, event._id);
      if (
        detailed.myRegistration &&
        ['registered', 'waitlisted', 'attended'].includes(detailed.myRegistration.status)
      ) {
        results.push({ event: detailed, registration: detailed.myRegistration });
      }
    }
  });
  await Promise.all(workers);
  return results.sort(
    (left, right) =>
      new Date(left.event.startDate).getTime() - new Date(right.event.startDate).getTime(),
  );
}
