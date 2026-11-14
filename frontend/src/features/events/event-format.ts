import type { CampusEvent } from '../../services/events/event-api';

export function getEventImage(event: CampusEvent): string | undefined {
  return event.flyerUrl || event.files?.find((file) => file.fileType === 'flyer')?.url;
}

export function formatEventDate(value: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  });
}

export function getRegistrationAvailability(
  event: CampusEvent,
  now = Date.now(),
): {
  label: string;
  open: boolean;
  tone: 'success' | 'warning' | 'critical' | 'neutral';
} {
  const ends = new Date(event.endDate).getTime();
  const opens = event.registrationOpenDate
    ? new Date(event.registrationOpenDate).getTime()
    : Number.NEGATIVE_INFINITY;
  const closes = event.registrationCloseDate
    ? new Date(event.registrationCloseDate).getTime()
    : Number.POSITIVE_INFINITY;
  if (event.status === 'cancelled') return { label: 'Cancelled', open: false, tone: 'critical' };
  if (event.status === 'completed' || ends < now)
    return { label: 'Event ended', open: false, tone: 'neutral' };
  if (now < opens)
    return {
      label: `Opens ${formatEventDate(event.registrationOpenDate!)}`,
      open: false,
      tone: 'warning',
    };
  if (closes < now) return { label: 'Registration closed', open: false, tone: 'neutral' };
  if (!['published', 'ongoing'].includes(event.status))
    return { label: 'Not open', open: false, tone: 'neutral' };
  if (event.capacity && event.capacity > 0 && (event.allocatedSeats ?? 0) >= event.capacity) {
    return event.allowWaitlist
      ? { label: 'Waitlist available', open: true, tone: 'warning' }
      : { label: 'Event full', open: false, tone: 'critical' };
  }
  return { label: 'Registration open', open: true, tone: 'success' };
}

export function getOrganizerLabel(event: CampusEvent): string {
  if (typeof event.organizer === 'object' && event.organizer.name) return event.organizer.name;
  if (event.coordinators?.length) return event.coordinators.map((person) => person.name).join(', ');
  return 'Organizer details unavailable';
}
