import { useCallback, useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Clock3, MapPin } from 'lucide-react';
import { Badge, Card } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getAcademicCalendars,
  getMyTimetable,
  type AcademicCalendar,
  type TimetableSlot,
} from '../../services/academics/academic-api';
import { FacultyEmpty, FacultyError, FacultyHeading, FacultyLoading } from './faculty-components';
import './faculty.css';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
function formatTime(minutes: number) {
  return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function FacultyAcademicActivitiesPage() {
  const { session } = useAuth();
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [calendars, setCalendars] = useState<AcademicCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      getMyTimetable(session.token),
      getAcademicCalendars(session.token),
    ]);
    const errors: string[] = [];
    if (results[0].status === 'fulfilled') setSlots(results[0].value);
    else
      errors.push(
        results[0].reason instanceof ApiError
          ? results[0].reason.message
          : 'Faculty timetable could not be loaded.',
      );
    if (results[1].status === 'fulfilled') setCalendars(results[1].value);
    else
      errors.push(
        results[1].reason instanceof ApiError
          ? results[1].reason.message
          : 'Academic calendar could not be loaded.',
      );
    setError(errors.join(' '));
    setLoading(false);
  }, [session?.token]);
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
        title="Academic activities"
        description="Your published teaching schedule and institution academic calendar."
      />
      {error && <FacultyError message={error} retry={() => void load()} />}
      <section className="faculty-panel">
        <header className="faculty-panel-head">
          <div>
            <span className="eyebrow">PUBLISHED SCHEDULE</span>
            <h2>My timetable</h2>
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
                  <th>Day</th>
                  <th>Course</th>
                  <th>Time</th>
                  <th>Location</th>
                  <th>Academic context</th>
                </tr>
              </thead>
              <tbody>
                {[...slots]
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinutes - b.startMinutes)
                  .map((slot) => (
                    <tr key={slot._id}>
                      <td>{days[slot.dayOfWeek - 1] ?? `Day ${slot.dayOfWeek}`}</td>
                      <td>
                        <strong>{slot.courseName}</strong>
                        <small>
                          {slot.courseCode} · {slot.sessionType}
                        </small>
                      </td>
                      <td>
                        {formatTime(slot.startMinutes)} – {formatTime(slot.endMinutes)}
                      </td>
                      <td>
                        {[slot.building, slot.roomNumber].filter(Boolean).join(' · ') ||
                          'Not specified'}
                      </td>
                      <td>
                        {slot.academicYear} · Semester {slot.semester}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <FacultyEmpty
            title="No published timetable"
            description="The timetable service has not returned published sessions for your faculty account."
          />
        )}
      </section>
      <section className="faculty-panel">
        <header className="faculty-panel-head">
          <div>
            <span className="eyebrow">INSTITUTION SCHEDULE</span>
            <h2>Academic calendar</h2>
          </div>
          <CalendarDays size={20} />
        </header>
        {loading ? (
          <FacultyLoading />
        ) : entries.length ? (
          <div className="faculty-calendar-list">
            {entries.map((event, index) => (
              <Card
                className="faculty-calendar-item"
                key={event._id ?? `${event.title}-${event.startDate}-${index}`}
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
                    {new Date(event.startDate).toLocaleString()} –{' '}
                    {new Date(event.endDate).toLocaleString()}
                  </small>
                  {event.targetDepartments?.length || event.targetBatches?.length ? (
                    <small>
                      <MapPin size={13} />
                      {[...(event.targetDepartments ?? []), ...(event.targetBatches ?? [])].join(
                        ' · ',
                      )}
                    </small>
                  ) : null}
                </div>
                <Badge variant={event.isHoliday ? 'warning' : 'outline'}>
                  {event.isHoliday ? 'Holiday' : event.type}
                </Badge>
              </Card>
            ))}
          </div>
        ) : (
          <FacultyEmpty
            title="No calendar entries"
            description="Published institution calendar items will appear here."
          />
        )}
      </section>
      <p className="faculty-data-note">
        <BookOpen size={15} /> Attendance, assessment, or grade details are shown only when
        available through the existing faculty APIs.
      </p>
    </div>
  );
}
