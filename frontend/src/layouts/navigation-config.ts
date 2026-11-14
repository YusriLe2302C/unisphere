import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardCheck,
  Compass,
  FileBarChart,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  MessageCircleQuestion,
  ScrollText,
  Settings2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '../types/auth';

export interface AppNavigationItem {
  path: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface AppNavigationSection {
  label: string;
  items: AppNavigationItem[];
}

const dashboard: AppNavigationItem = {
  path: '/app',
  label: 'Dashboard',
  icon: LayoutDashboard,
  end: true,
};
const notifications: AppNavigationItem = {
  path: '/app/notifications',
  label: 'Notifications',
  icon: Bell,
};
const profile: AppNavigationItem = {
  path: '/app/profile',
  label: 'Profile',
  icon: Users,
};
const conversations: AppNavigationItem = {
  path: '/app/conversations',
  label: 'Conversations',
  icon: MessageCircle,
};

const studentSections: AppNavigationSection[] = [
  {
    label: 'Workspace',
    items: [
      dashboard,
      { path: '/app/academics', label: 'Academics', icon: BookOpen },
      { path: '/app/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Discover',
    items: [
      { path: '/app/events', label: 'Events', icon: CalendarDays },
      { path: '/app/research', label: 'Research and Development', icon: FlaskConical },
      { path: '/app/career-connect', label: 'Career Connect', icon: Compass },
      { path: '/app/placements', label: 'Placements', icon: BriefcaseBusiness },
      conversations,
    ],
  },
  { label: 'Personal', items: [notifications, profile] },
];

const facultySections: AppNavigationSection[] = [
  {
    label: 'Workspace',
    items: [dashboard, { path: '/app/announcements', label: 'Announcements', icon: Megaphone }],
  },
  {
    label: 'Academic work',
    items: [
      { path: '/app/research', label: 'Research', icon: FlaskConical },
      { path: '/app/submissions', label: 'Student Submissions', icon: ClipboardCheck },
      { path: '/app/academic-activities', label: 'Academic Activities', icon: BookOpen },
      { path: '/app/events', label: 'Events', icon: CalendarDays },
    ],
  },
  { label: 'Personal', items: [notifications, conversations, profile] },
];

const alumniSections: AppNavigationSection[] = [
  {
    label: 'Workspace',
    items: [
      dashboard,
      { path: '/app/career-connect', label: 'Career Connect', icon: Compass },
      {
        path: '/app/career-connect/questions',
        label: 'Student Questions',
        icon: MessageCircleQuestion,
      },
      { path: '/app/career-connect/alumni', label: 'Alumni Directory', icon: Users },
    ],
  },
  {
    label: 'Network',
    items: [
      { path: '/app/career-connect/connections', label: 'Connections', icon: Users },
      { path: '/app/mentorship', label: 'Mentorship', icon: GraduationCap },
      conversations,
      { path: '/app/opportunities', label: 'Opportunities', icon: BriefcaseBusiness },
    ],
  },
  { label: 'Personal', items: [profile] },
];

const administrationSections: AppNavigationSection[] = [
  { label: 'Workspace', items: [dashboard, { path: '/app/users', label: 'Users', icon: Users }] },
  {
    label: 'Institution',
    items: [
      { path: '/app/announcements', label: 'Announcements', icon: Megaphone },
      { path: '/app/events', label: 'Events', icon: CalendarDays },
      { path: '/app/research', label: 'Research', icon: FlaskConical },
      { path: '/app/placements', label: 'Placements', icon: BriefcaseBusiness },
      { path: '/app/reports', label: 'Reports', icon: FileBarChart },
      { path: '/app/administration', label: 'Administration', icon: Settings2 },
    ],
  },
  { label: 'Personal', items: [notifications, conversations, profile] },
];

const leadershipSections: AppNavigationSection[] = [
  { label: 'Workspace', items: [dashboard, { path: '/app/users', label: 'Users', icon: Users }] },
  {
    label: 'Institution',
    items: [
      { path: '/app/announcements', label: 'Institutional Announcements', icon: Megaphone },
      conversations,
      { path: '/app/academics', label: 'Academic Overview', icon: BookOpen },
      { path: '/app/research', label: 'Research Overview', icon: FlaskConical },
      { path: '/app/events', label: 'Events', icon: CalendarDays },
      { path: '/app/reports', label: 'Reports', icon: FileBarChart },
      { path: '/app/administration', label: 'Administrative Sections', icon: ScrollText },
    ],
  },
  { label: 'Personal', items: [notifications, profile] },
];

export const NAVIGATION_BY_ROLE: Record<UserRole, AppNavigationSection[]> = {
  student: studentSections,
  faculty: facultySections,
  alumni: alumniSections,
  dean: leadershipSections,
  principal: leadershipSections,
  admin: administrationSections,
  superadmin: administrationSections,
};

export function getNavigationForRole(role: UserRole | undefined): AppNavigationSection[] {
  return role ? NAVIGATION_BY_ROLE[role] : [];
}

export function getCurrentNavigationItem(
  pathname: string,
  role: UserRole | undefined,
): AppNavigationItem | undefined {
  return getNavigationForRole(role)
    .flatMap((section) => section.items)
    .find((item) => item.path === pathname && (item.end || item.path !== '/app'));
}
