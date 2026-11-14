import { apiRequest } from '../api';

export interface TimetableSlot {
  _id: string;
  semester: number;
  academicYear: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  courseCode: string;
  courseName: string;
  section?: string;
  facultyId: string | { _id: string; name: string; email?: string };
  roomNumber: string;
  building: string;
  sessionType: 'lecture' | 'laboratory' | 'tutorial' | 'exam';
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface AcademicCalendarEvent {
  _id?: string;
  title: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
  isHoliday: boolean;
  targetDepartments?: string[];
  targetBatches?: string[];
}

export interface AcademicCalendar {
  _id: string;
  academicYear: string;
  semesterType: 'odd' | 'even' | 'annual';
  events: AcademicCalendarEvent[];
}

export async function getMyTimetable(
  token: string,
  academicYear?: string,
): Promise<TimetableSlot[]> {
  const response = await apiRequest<{ slots: TimetableSlot[] }>('timetable/me', {
    token,
    query: academicYear ? { academicYear } : undefined,
  });
  return response.slots;
}

export async function getDepartmentTimetable(
  token: string,
  department: string,
  filters: { academicYear?: string; semester?: number; section?: string } = {},
): Promise<TimetableSlot[]> {
  const response = await apiRequest<{ slots: TimetableSlot[] }>(
    `timetable/department/${encodeURIComponent(department)}`,
    { token, query: filters },
  );
  return response.slots;
}

export async function getAcademicCalendars(
  token: string,
  academicYear?: string,
  dateRange?: { from: string; to: string },
): Promise<AcademicCalendar[]> {
  const response = await apiRequest<{ calendars: AcademicCalendar[] }>('events/calendar/list', {
    token,
    query: { academicYear, from: dateRange?.from, to: dateRange?.to },
  });
  return response.calendars;
}
