import mongoose, { Document, Schema, Types } from 'mongoose';

export type PrimaryRole =
  | 'student'
  | 'alumni'
  | 'faculty'
  | 'dean'
  | 'principal'
  | 'admin';

export type ScopedResponsibility =
  | 'proctor'
  | 'project_guide'
  | 'rnd_staff'
  | 'placement_coordinator'
  | 'club_advisor'
  | 'timetable_coordinator';

// Legacy compat alias
export type UserRole = PrimaryRole | 'superadmin';

export type DisciplinaryStatus =
  | 'good_standing'
  | 'warning'
  | 'probation'
  | 'suspended';

export type AcademicDegree =
  | 'btech'
  | 'mtech'
  | 'bca'
  | 'mca'
  | 'bsc'
  | 'msc'
  | 'phd'
  | 'diploma';

export interface IProject {
  title: string;
  description: string;
  link?: string;
  tags?: string[];
}

export interface IAchievement {
  title: string;
  issuer?: string;
  year?: number;
  description?: string;
}

export interface INotificationPreferences {
  inAppAlerts?: boolean;
  opportunityAlerts?: boolean;
  eventAlerts?: boolean;
  researchAlerts?: boolean;
  communityAlerts?: boolean;
}

export interface IPrivacySettings {
  showEmail: boolean;
  showPhone: boolean;
  showAcademicDetails: boolean;
  allowDirectMessages: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;  // PrimaryRole | 'superadmin'
  responsibilities: ScopedResponsibility[];
  institution: string;
  collegeId?: string;
  institutionDomain: string;
  isVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  tokenVersion: number;
  lastSeenAt?: Date;
  avatar: string;
  headline: string;
  bio: string;
  department: string;
  degree?: AcademicDegree;
  batch?: string;
  semester?: number;
  section?: string;
  cgpa?: number;
  graduationYear?: number;
  disciplinaryStatus: DisciplinaryStatus;
  isPlacementEligible: boolean;
  alumniProfile?: { company?: string; designation?: string; industry?: string; yearsExperience?: number; mentorshipInterests?: string[] };
  privacySettings: IPrivacySettings;
  skills: string[];
  interests: string[];
  projects: IProject[];
  achievements: IAchievement[];
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  notificationPreferences?: INotificationPreferences;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    link: { type: String, default: '' },
    tags: { type: [String], default: [] }
  },
  { _id: false }
);

const AchievementSchema = new Schema<IAchievement>(
  {
    title: { type: String, required: true },
    issuer: { type: String, default: '' },
    year: { type: Number },
    description: { type: String, default: '' }
  },
  { _id: false }
);

const ALL_PRIMARY_ROLES: PrimaryRole[] = ['student', 'alumni', 'faculty', 'dean', 'principal', 'admin'];
const ALL_RESPONSIBILITIES: ScopedResponsibility[] = [
  'proctor', 'project_guide', 'rnd_staff', 'placement_coordinator', 'club_advisor', 'timetable_coordinator'
];

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: [...ALL_PRIMARY_ROLES, 'superadmin'],
      default: 'student',
      required: true
    },
    responsibilities: {
      type: [String],
      enum: ALL_RESPONSIBILITIES,
      default: []
    },
    institution: { type: String, required: true, trim: true, index: true },
    collegeId: { type: String, trim: true, index: true },
    institutionDomain: { type: String, default: '', trim: true },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0 },
    lastSeenAt: { type: Date },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    headline: { type: String, default: '' },
    bio: { type: String, default: '' },
    department: { type: String, default: 'General', index: true },
    degree: {
      type: String,
      enum: ['btech', 'mtech', 'bca', 'mca', 'bsc', 'msc', 'phd', 'diploma']
    },
    batch: { type: String },
    semester: { type: Number, min: 1, max: 12 },
    section: { type: String },
    cgpa: { type: Number, min: 0, max: 10 },
    graduationYear: { type: Number },
    disciplinaryStatus: {
      type: String,
      enum: ['good_standing', 'warning', 'probation', 'suspended'],
      default: 'good_standing',
      index: true
    },
    isPlacementEligible: { type: Boolean, default: false, index: true },
    alumniProfile: { company: String, designation: String, industry: String, yearsExperience: { type: Number, min: 0 }, mentorshipInterests: { type: [String], default: [] } },
    privacySettings: {
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      showAcademicDetails: { type: Boolean, default: true },
      allowDirectMessages: { type: Boolean, default: true }
    },
    skills: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    achievements: { type: [AchievementSchema], default: [] },
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    notificationPreferences: {
      inAppAlerts: { type: Boolean, default: true },
      opportunityAlerts: { type: Boolean, default: true },
      eventAlerts: { type: Boolean, default: true },
      researchAlerts: { type: Boolean, default: true },
      communityAlerts: { type: Boolean, default: true }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

UserSchema.index({ institution: 1, department: 1, role: 1 });
UserSchema.index({ collegeId: 1, department: 1, role: 1 }, { sparse: true });
UserSchema.index(
  { collegeId: 1, isPlacementEligible: 1, cgpa: -1 },
  { partialFilterExpression: { role: 'student' } }
);

export const User = mongoose.model<IUser>('User', UserSchema);
