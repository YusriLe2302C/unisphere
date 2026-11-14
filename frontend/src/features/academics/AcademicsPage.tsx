import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../app/providers/useAuth';
import { Badge, Card, Spinner } from '../../components/ui';
import { ApiError } from '../../services/api';
import {
  getAcademicCalendars,
  getMyTimetable,
  type AcademicCalendar,
  type TimetableSlot,
} from '../../services/academics/academic-api';
import './academics.css';

interface Course {
  code: string;
  name: string;
  slots: TimetableSlot[];
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return new Date(2000, 0, 1, hours, minute).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function slotDescription(slot: TimetableSlot): string {
  const faculty = typeof slot.facultyId === 'object' ? slot.facultyId.name : '';
  const room = [slot.building, slot.roomNumber].filter(Boolean).join(' · ');
  return [
    slot.sessionType,
    `${formatTime(slot.startMinutes)}–${formatTime(slot.endMinutes)}`,
    room,
    faculty,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function AcademicsPage() {
  const { user, session } = useAuth();
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [calendars, setCalendars] = useState<AcademicCalendar[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [timetableError, setTimetableError] = useState('');
  const [calendarError, setCalendarError] = useState('');

  const loadAcademicData = useCallback(async () => {
    if (!session?.token || user?.role !== 'student') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setTimetableError('');
    setCalendarError('');
    const [timetableResult, calendarResult] = await Promise.allSettled([
      getMyTimetable(session.token, selectedYear || undefined),
      getAcademicCalendars(session.token, selectedYear || undefined),
    ]);
    if (timetableResult.status === 'fulfilled') {
      setSlots(timetableResult.value);
      setAvailableYears((years) =>
        [...new Set([...years, ...timetableResult.value.map((slot) => slot.academicYear)])].sort(),
      );
    } else {
      setTimetableError(
        timetableResult.reason instanceof ApiError
          ? timetableResult.reason.message
          : 'Published timetable could not be loaded.',
      );
    }
    if (calendarResult.status === 'fulfilled') {
      setCalendars(calendarResult.value);
      setAvailableYears((years) =>
        [
          ...new Set([...years, ...calendarResult.value.map((calendar) => calendar.academicYear)]),
        ].sort(),
      );
    } else {
      setCalendarError(
        calendarResult.reason instanceof ApiError
          ? calendarResult.reason.message
          : 'Academic calendar could not be loaded.',
      );
    }
    setLoading(false);
  }, [session?.token, user?.role, selectedYear]);

  useEffect(() => {
    void loadAcademicData();
  }, [loadAcademicData]);

  const courses = useMemo<Course[]>(() => {
    const grouped = new Map<string, Course>();
    for (const slot of slots) {
      const key = `${slot.courseCode}:${slot.courseName}`;
      const course = grouped.get(key) ?? {
        code: slot.courseCode,
        name: slot.courseName,
        slots: [],
      };
      course.slots.push(slot);
      grouped.set(key, course);
    }
    return [...grouped.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [slots]);

  const academicEvents = useMemo(
    () =>
      calendars
        .flatMap((calendar) =>
          calendar.events.map((event) => ({
            ...event,
            academicYear: calendar.academicYear,
            semesterType: calendar.semesterType,
          })),
        )
        .filter(
          (event) =>
            !event.targetDepartments?.length ||
            event.targetDepartments.includes(user?.department ?? ''),
        )
        .filter(
          (event) =>
            !event.targetBatches?.length || event.targetBatches.includes(user?.batch ?? ''),
        )
        .sort(
          (left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime(),
        ),
    [calendars, user?.department, user?.batch],
  );

  if (user?.role !== 'student') {
    return (
      <section className="academics-state">
        <AlertCircle size={22} />
        <h1>Student academics</h1>
        <p>This academic overview is available to student accounts.</p>
      </section>
    );
  }

  const cgpa = typeof user.cgpa === 'number' && Number.isFinite(user.cgpa) ? user.cgpa : null;
  const assessmentEvents = academicEvents.filter(
    (event) => event.type === 'internal_assessment' || event.type === 'exam',
  );

  return (
    <div className="academics-page">
      <header className="academics-heading">
        <div>
          <div className="eyebrow">STUDENT WORKSPACE</div>
          <h1>Academics</h1>
          <p>Your academic profile, published course schedule, and institutional dates.</p>
        </div>
        {availableYears.length > 1 && (
          <label className="academics-year-picker">
            Academic year
            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
              <option value="">All available years</option>
              {availableYears.map((year) => (
                <option value={year} key={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <section className="academics-summary" aria-label="Academic overview">
        <Card className="academics-summary-card">
          <span className="academics-summary-icon">
            <GraduationCap size={20} />
          </span>
          <span className="academics-summary-label">Current semester</span>
          <strong>{user.semester ? `Semester ${user.semester}` : 'Not provided'}</strong>
          <small>
            {[
              user.degree?.toUpperCase(),
              user.batch && `Batch ${user.batch}`,
              user.section && `Section ${user.section}`,
            ]
              .filter(Boolean)
              .join(' · ') || 'Academic profile details'}
          </small>
        </Card>
        <Card className="academics-summary-card">
          <span className="academics-summary-icon">
            <BookOpen size={20} />
          </span>
          <span className="academics-summary-label">Published subjects</span>
          <strong>{loading ? '—' : courses.length}</strong>
          <small>
            {loading
              ? 'Loading timetable'
              : courses.length === 1
                ? 'From your published timetable'
                : 'From your published timetable'}
          </small>
        </Card>
        <Card className="academics-summary-card">
          <span className="academics-summary-icon">
            <GraduationCap size={20} />
          </span>
          <span className="academics-summary-label">CGPA</span>
          <strong>{cgpa === null ? 'Not provided' : cgpa.toFixed(2)}</strong>
          <small>
            {cgpa === null ? 'No CGPA recorded on your profile' : 'Profile academic record'}
          </small>
        </Card>
        <Card className="academics-summary-card">
          <span className="academics-summary-icon">
            <CalendarDays size={20} />
          </span>
          <span className="academics-summary-label">Attendance records</span>
          <strong>Not available</strong>
          <small>Course attendance is not exposed by the current API</small>
        </Card>
      </section>

      <section className="academics-panel" aria-labelledby="attendance-chart-title">
        <div className="academics-panel-heading">
          <div>
            <span className="eyebrow">ATTENDANCE OVERVIEW</span>
            <h2 id="attendance-chart-title">Subject-wise attendance</h2>
          </div>
          <span className="academics-data-note">Attendance records unavailable</span>
        </div>
        <AttendanceChart courses={courses} />
        <div className="attendance-legend" aria-label="Attendance thresholds">
          <span>
            <i className="attendance-dot excellent" /> Above 80% · Excellent
          </span>
          <span>
            <i className="attendance-dot eligible" /> 75–80% · Eligible
          </span>
          <span>
            <i className="attendance-dot shortage" /> 70–74.99% · Shortage
          </span>
          <span>
            <i className="attendance-dot critical" /> Below 70% · Critical
          </span>
        </div>
      </section>

      <section className="academics-panel" aria-labelledby="attendance-table-title">
        <div className="academics-panel-heading">
          <div>
            <span className="eyebrow">COURSE RECORDS</span>
            <h2 id="attendance-table-title">Attendance by subject</h2>
          </div>
          <span className="academics-table-caption">Based on available academic data</span>
        </div>
        {timetableError && (
          <div className="academics-inline-error" role="alert">
            <span>{timetableError}</span>
            <button type="button" onClick={() => void loadAcademicData()}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="academics-loading" role="status">
            <Spinner size="sm" label="Loading academic records" /> Loading published subjects…
          </div>
        ) : courses.length === 0 ? (
          <div className="academics-empty">
            <BookOpen size={20} />
            <strong>No published subjects found</strong>
            <span>
              {timetableError
                ? 'The timetable could not be retrieved.'
                : 'No subjects are listed in your published timetable for this selection.'}
            </span>
          </div>
        ) : (
          <div className="academics-table-scroll">
            <table className="academics-table">
              <caption className="us-sr-only">
                Student subject attendance information. Attendance values are unavailable in the
                current academic API.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Subject</th>
                  <th scope="col">Subject code</th>
                  <th scope="col">Classes conducted</th>
                  <th scope="col">Classes attended</th>
                  <th scope="col">Attendance</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={`${course.code}:${course.name}`}>
                    <th scope="row">
                      <details className="academics-course-details">
                        <summary>
                          {course.name}
                          <span>
                            {course.slots.length} published timetable{' '}
                            {course.slots.length === 1 ? 'entry' : 'entries'}
                          </span>
                        </summary>
                        <div>
                          {course.slots.map((slot) => (
                            <p key={slot._id}>{slotDescription(slot)}</p>
                          ))}
                        </div>
                      </details>
                    </th>
                    <td>{course.code || '—'}</td>
                    <td>
                      <span
                        className="academics-unavailable"
                        aria-label="Not available from the current academic API"
                      >
                        —
                      </span>
                    </td>
                    <td>
                      <span
                        className="academics-unavailable"
                        aria-label="Not available from the current academic API"
                      >
                        —
                      </span>
                    </td>
                    <td>
                      <span
                        className="academics-unavailable"
                        aria-label="Not available from the current academic API"
                      >
                        —
                      </span>
                    </td>
                    <td>
                      <Badge variant="outline" size="sm">
                        No record
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!timetableError && !loading && courses.length > 0 && (
          <p className="academics-source-note">
            The current backend returns course schedules but does not provide course attendance
            counts or percentages. Dashes indicate unavailable values, not zero.
          </p>
        )}
      </section>

      <section className="academics-panel academics-lower-grid">
        <div>
          <div className="academics-panel-heading">
            <div>
              <span className="eyebrow">ASSESSMENTS</span>
              <h2>Exams and internal assessments</h2>
            </div>
          </div>
          {calendarError ? (
            <div className="academics-inline-error" role="alert">
              <span>{calendarError}</span>
              <button type="button" onClick={() => void loadAcademicData()}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : assessmentEvents.length ? (
            <ul className="academics-assessment-list">
              {assessmentEvents.map((event) => (
                <li key={event._id ?? `${event.academicYear}-${event.title}-${event.startDate}`}>
                  <span className="academics-assessment-icon">
                    <CalendarDays size={17} />
                  </span>
                  <span>
                    <strong>{event.title}</strong>
                    <small>
                      {event.type === 'exam' ? 'Examination' : 'Internal assessment'} ·{' '}
                      {event.academicYear} · {event.semesterType}
                    </small>
                  </span>
                  <time dateTime={event.startDate}>
                    {new Date(event.startDate).toLocaleDateString()}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <div className="academics-empty compact">
              <CalendarDays size={19} />
              <span>No assessment dates are available in the published academic calendar.</span>
            </div>
          )}
        </div>
        <div className="academics-history">
          <div className="academics-panel-heading">
            <div>
              <span className="eyebrow">ACADEMIC PROFILE</span>
              <h2>Academic details</h2>
            </div>
          </div>
          <dl>
            <div>
              <dt>Institution</dt>
              <dd>{user.institution || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{user.department || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Degree</dt>
              <dd>{user.degree?.toUpperCase() || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Graduation year</dt>
              <dd>{user.graduationYear ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt>CGPA</dt>
              <dd>{cgpa === null ? 'Not provided' : cgpa.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}

function AttendanceChart({ courses }: { courses: Course[] }) {
  return (
    <div
      className="attendance-chart"
      role="img"
      aria-label={`Attendance chart for ${courses.length} published subjects. Attendance percentages are unavailable from the current backend; 75 percent and 80 percent eligibility references are shown.`}
    >
      <div className="attendance-chart-plot">
        <div className="attendance-y-axis">
          <span>100%</span>
          <span>80%</span>
          <span>75%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div className="attendance-chart-area">
          <div className="attendance-reference excellent-line">
            <span>80% excellent threshold</span>
          </div>
          <div className="attendance-reference eligible-line">
            <span>75% eligibility threshold</span>
          </div>
          <div className="attendance-chart-empty">
            <Clock3 size={19} />
            <span>Subject attendance percentages have not been provided</span>
          </div>
          <div className="attendance-x-axis">
            {courses.map((course) => (
              <span key={`${course.code}:${course.name}`} title={course.name}>
                {course.code || course.name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="attendance-chart-alternative">
        {courses.length
          ? `Subjects in this view: ${courses.map((course) => `${course.name}${course.code ? ` (${course.code})` : ''}`).join(', ')}. Percentage values are unavailable.`
          : 'No subjects are available to chart.'}
      </p>
    </div>
  );
}
