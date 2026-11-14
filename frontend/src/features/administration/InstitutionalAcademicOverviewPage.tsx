import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Clock3 } from 'lucide-react';
import { Badge } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getAcademicCalendars,
  getDepartmentTimetable,
  type AcademicCalendar,
  type TimetableSlot,
} from '../../services/academics/academic-api';
import {
  FacultyEmpty,
  FacultyError,
  FacultyHeading,
  FacultyLoading,
} from '../faculty/faculty-components';
import '../faculty/faculty.css';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function time(value: number) {
  return new Date(2000, 0, 1, Math.floor(value / 60), value % 60).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}
export function InstitutionalAcademicOverviewPage() {
  const { session, user } = useAuth();
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [calendars, setCalendars] = useState<AcademicCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    const calendarRequest = getAcademicCalendars(session.token);
    const timetableRequest = user?.department
      ? getDepartmentTimetable(session.token, user.department)
      : Promise.resolve<TimetableSlot[]>([]);
    const [calendarResult, timetableResult] = await Promise.allSettled([
      calendarRequest,
      timetableRequest,
    ]);
    const errors: string[] = [];
    if (calendarResult.status === 'fulfilled') setCalendars(calendarResult.value);
    else
      errors.push(
        calendarResult.reason instanceof ApiError
          ? calendarResult.reason.message
          : 'Academic calendars could not be loaded.',
      );
    if (timetableResult.status === 'fulfilled') setSlots(timetableResult.value);
    else
      errors.push(
        timetableResult.reason instanceof ApiError
          ? timetableResult.reason.message
          : 'Department timetable could not be loaded.',
      );
    setError(errors.join(' '));
    setLoading(false);
  }, [session?.token, user?.department]);
  useEffect(() => {
    void load();
  }, [load]);
  const entries = calendars
    .flatMap((calendar) =>
      calendar.events.map((event) => ({ ...event, academicYear: calendar.academicYear })),
    )
    .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
  return (
    <div className="faculty-page">
      <FacultyHeading
        title="Academic overview"
        description={`${user?.institution || 'Institution'}${user?.department ? ` · ${user.department} department schedule` : ''}. Published data only.`}
      />
      {error && <FacultyError message={error} retry={() => void load()} />}
      <section className="faculty-panel">
        <header className="faculty-panel-head">
          <div>
            <span className="eyebrow">PUBLISHED TEACHING SCHEDULE</span>
            <h2>{user?.department || 'Department timetable'}</h2>
          </div>
          <Badge variant="outline">{slots.length} sessions</Badge>
        </header>
        {loading ? (
          <FacultyLoading />
        ) : slots.length ? (
          <div className="faculty-table-wrap">
            <table className="faculty-table">
              <thead>
                <tr>
                  <th>Day and time</th>
                  <th>Course</th>
                  <th>Faculty</th>
                  <th>Section / semester</th>
                  <th>Room</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot._id}>
                    <td>
                      {days[slot.dayOfWeek - 1] || `Day ${slot.dayOfWeek}`}
                      <small>
                        {time(slot.startMinutes)}–{time(slot.endMinutes)}
                      </small>
                    </td>
                    <td>
                      <strong>{slot.courseName}</strong>
                      <small>
                        {slot.courseCode} · {slot.academicYear}
                      </small>
                    </td>
                    <td>
                      {typeof slot.facultyId === 'object'
                        ? slot.facultyId.name || slot.facultyId.email
                        : 'Faculty'}
                    </td>
                    <td>
                      {slot.section} · Semester {slot.semester}
                    </td>
                    <td>{[slot.building, slot.roomNumber].filter(Boolean).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <FacultyEmpty
            title="No department timetable available"
            description="The published timetable service returned no schedule for the signed-in user's department."
          />
        )}
      </section>
      <section className="faculty-panel">
        <header className="faculty-panel-head">
          <div>
            <span className="eyebrow">ACADEMIC CALENDAR</span>
            <h2>Institution schedule</h2>
          </div>
          <CalendarDays size={19} />
        </header>
        {loading ? (
          <FacultyLoading />
        ) : entries.length ? (
          <div className="faculty-calendar-list">
            {entries.map((event, index) => (
              <article
                className="faculty-calendar-item"
                key={event._id || `${event.title}-${index}`}
              >
                <div className="faculty-calendar-date">
                  <strong>
                    {new Date(event.startDate).toLocaleDateString([], { day: '2-digit' })}
                  </strong>
                  <span>
                    {new Date(event.startDate).toLocaleDateString([], { month: 'short' })}
                  </span>
                </div>
                <div className="faculty-calendar-content">
                  <h3>{event.title}</h3>
                  {event.description && <p>{event.description}</p>}
                  <small>
                    <Clock3 size={13} />
                    {event.academicYear} · {new Date(event.startDate).toLocaleString()} –{' '}
                    {new Date(event.endDate).toLocaleString()}
                  </small>
                </div>
                <Badge variant={event.isHoliday ? 'warning' : 'outline'}>
                  {event.isHoliday ? 'Holiday' : event.type}
                </Badge>
              </article>
            ))}
          </div>
        ) : (
          <FacultyEmpty
            title="No published calendar records"
            description="Institution calendar events will display here when available."
          />
        )}
      </section>
      <p className="faculty-data-note">
        <BookOpen size={14} />
        Academic timetable and calendar records are sourced from the existing published schedules.
      </p>
    </div>
  );
}
