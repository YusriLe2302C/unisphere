import { ArrowLeft, Compass } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const names: Record<string, string> = {
  academics: 'Academics',
  'academic-activities': 'Academic Activities',
  announcements: 'Announcements',
  calendar: 'Calendar',
  submissions: 'Student Submissions',
  events: 'Events',
  research: 'Research',
  'career-connect': 'Career connect',
  placements: 'Placements',
  alumni: 'Alumni network',
  mentorship: 'Mentorship',
  conversations: 'Conversations',
  opportunities: 'Opportunities',
  users: 'Users',
  reports: 'Reports',
  settings: 'Settings',
  community: 'Communities',
  notifications: 'Notifications',
  profile: 'My profile',
  administration: 'Administration',
};

export function ComingSoonPage() {
  const { pathname } = useLocation();
  const section = pathname.split('/').filter(Boolean).at(-1) ?? 'workspace';
  const title = names[section] ?? 'Workspace';
  return (
    <section className="empty-feature">
      <span className="empty-feature-icon">
        <Compass size={22} />
      </span>
      <div className="eyebrow">YOUR WORKSPACE</div>
      <h1>{title}</h1>
      <p>
        This space is ready for the next part of UniSphere. The foundation is in place; this feature
        will connect to the live backend as it’s built.
      </p>
      <Link className="text-link" to="/app">
        <ArrowLeft size={15} /> Back to overview
      </Link>
    </section>
  );
}
