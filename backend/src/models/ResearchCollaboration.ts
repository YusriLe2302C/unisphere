import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICollaborationRole {
  _id?: Types.ObjectId;
  roleTitle: string;
  description: string;
  vacancies: number;
  filled: number;
}

export interface ITeamMember {
  user: Types.ObjectId;
  role: string;
  joinedAt: Date;
}

export interface ICollaborationApplication {
  _id: Types.ObjectId;
  applicant: Types.ObjectId;
  roleSought: string;
  statement: string;
  relevantSkills: string[];
  interests: string[];
  portfolioUrl?: string;
  status: 'pending' | 'applied' | 'shortlisted' | 'accepted' | 'declined' | 'withdrawn';
  reviewerNotes?: string;
  appliedAt: Date;
  reviewedAt?: Date;
}

export interface IResearchCollaboration extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  leadResearcher: Types.ObjectId;
  supervisor?: Types.ObjectId;
  institution: string;
  department: string;
  subject: string;
  requiredSkills: string[];
  openRoles: ICollaborationRole[];
  teamMembers: ITeamMember[];
  applications: ICollaborationApplication[];
  visibility: 'public' | 'institution-only';
  status: 'open' | 'in_progress' | 'completed' | 'closed';
  tags: string[];
  externalLinks: { title: string; url: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const CollaborationRoleSchema = new Schema<ICollaborationRole>({
  roleTitle: { type: String, required: true },
  description: { type: String, default: '' },
  vacancies: { type: Number, default: 1 },
  filled: { type: Number, default: 0 }
});

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'Co-Investigator' },
    joinedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const CollaborationApplicationSchema = new Schema<ICollaborationApplication>({
  applicant: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roleSought: { type: String, required: true },
  statement: { type: String, required: true },
  relevantSkills: { type: [String], default: [] },
  interests: { type: [String], default: [] },
  portfolioUrl: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'applied', 'shortlisted', 'accepted', 'declined', 'withdrawn'],
    default: 'pending'
  },
  reviewerNotes: { type: String, default: '' },
  appliedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date }
});

const ResearchCollaborationSchema = new Schema<IResearchCollaboration>(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    leadResearcher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    supervisor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    institution: { type: String, required: true, index: true },
    department: { type: String, default: 'Research & Development' },
    subject: { type: String, required: true, index: true },
    requiredSkills: { type: [String], default: [], index: true },
    openRoles: { type: [CollaborationRoleSchema], default: [] },
    teamMembers: { type: [TeamMemberSchema], default: [] },
    applications: { type: [CollaborationApplicationSchema], default: [] },
    visibility: {
      type: String,
      enum: ['public', 'institution-only'],
      default: 'public',
      index: true
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'closed'],
      default: 'open',
      index: true
    },
    tags: { type: [String], default: [] },
    externalLinks: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true }
      }
    ]
  },
  { timestamps: true }
);

// Compound text search index
ResearchCollaborationSchema.index({
  title: 'text',
  description: 'text',
  requiredSkills: 'text',
  tags: 'text'
});

export const ResearchCollaboration = mongoose.model<IResearchCollaboration>(
  'ResearchCollaboration',
  ResearchCollaborationSchema
);
