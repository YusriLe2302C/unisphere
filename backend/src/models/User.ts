import mongoose, { Document, Schema, Types } from 'mongoose';

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

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'student' | 'alumni' | 'faculty' | 'admin';
  institution: string;
  institutionDomain: string;
  isVerified: boolean;
  avatar: string;
  headline: string;
  bio: string;
  department: string;
  graduationYear?: number;
  skills: string[];
  interests: string[];
  projects: IProject[];
  achievements: IAchievement[];
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  notificationPreferences?: INotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  link: { type: String, default: '' },
  tags: { type: [String], default: [] }
});

const AchievementSchema = new Schema<IAchievement>({
  title: { type: String, required: true },
  issuer: { type: String, default: '' },
  year: { type: Number },
  description: { type: String, default: '' }
});

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'alumni', 'faculty', 'admin'],
      default: 'student',
      required: true
    },
    institution: { type: String, required: true, trim: true },
    institutionDomain: { type: String, default: '', trim: true },
    isVerified: { type: Boolean, default: true },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    headline: { type: String, default: '' },
    bio: { type: String, default: '' },
    department: { type: String, default: 'Computer Science & Engineering' },
    graduationYear: { type: Number },
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
    }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
