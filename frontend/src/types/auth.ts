export type UserRole =
  'student' | 'alumni' | 'faculty' | 'dean' | 'principal' | 'admin' | 'superadmin';

export type UserResponsibility =
  | 'proctor'
  | 'project_guide'
  | 'rnd_staff'
  | 'placement_coordinator'
  | 'club_advisor'
  | 'timetable_coordinator';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  responsibilities: UserResponsibility[];
  institution: string;
  department: string;
  avatar: string;
  headline: string;
  bio?: string;
  phone?: string;
  interests?: string[];
  privacySettings?: {
    showEmail?: boolean;
    showPhone?: boolean;
    showAcademicDetails?: boolean;
    allowDirectMessages?: boolean;
  };
  notificationPreferences?: Record<string, boolean>;
  isVerified: boolean;
  isActive: boolean;
  collegeId?: string;
  degree?: 'btech' | 'mtech' | 'bca' | 'mca' | 'bsc' | 'msc' | 'phd' | 'diploma';
  batch?: string;
  semester?: number;
  section?: string;
  cgpa?: number;
  graduationYear?: number;
  skills?: string[];
  alumniProfile?: {
    company?: string;
    designation?: string;
    industry?: string;
    yearsExperience?: number;
    mentorshipInterests?: string[];
  };
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'faculty' | 'alumni';
  institution: string;
  department?: string;
  graduationYear?: number;
  headline?: string;
  bio?: string;
  collegeId?: string;
  batch?: string;
  semester?: number;
  degree?: 'btech' | 'mtech' | 'bca' | 'mca' | 'bsc' | 'msc' | 'phd' | 'diploma';
}

export interface MessageResponse {
  message: string;
}

export interface ForgotPasswordResponse extends MessageResponse {
  resetToken?: string;
}
