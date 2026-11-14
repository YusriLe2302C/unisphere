import mongoose, { Document, Schema, Types } from 'mongoose';

export type OpportunityType = 
  | 'Internship' 
  | 'Research Assistantship' 
  | 'Job' 
  | 'Hackathon' 
  | 'Scholarship' 
  | 'Mentorship' 
  | 'Grant' 
  | 'Research'
  | 'Placement'
  | 'Competition'
  | 'Volunteering'
  | 'Club Recruitment';

export interface IOpportunity extends Document {
  _id: Types.ObjectId;
  title: string;
  organization: string;
  institution?: string;
  type: OpportunityType;
  location: string;
  description: string;
  requirements: string[];
  applicationQuestions: string[];
  community?: Types.ObjectId | null;
  deadline?: string;
  applyUrl: string;
  isPlacementDrive: boolean;
  companyDetails?: { website?: string; description?: string; contactEmail?: string };
  requiredSkills: string[];
  minimumCgpa?: number;
  eligibleBranches: string[];
  eligibleBatches: string[];
  requiresResume: boolean;
  package?: string;
  applicationDeadline?: Date;
  isActive: boolean;
  postedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>(
  {
    title: { type: String, required: true, trim: true },
    organization: { type: String, required: true, trim: true },
    institution: { type: String, default: '', index: true },
    type: {
      type: String,
      enum: [
        'Internship', 
        'Research Assistantship', 
        'Job', 
        'Hackathon', 
        'Scholarship', 
        'Mentorship', 
        'Grant', 
        'Research',
        'Placement',
        'Competition',
        'Volunteering',
        'Club Recruitment'
      ],
      default: 'Internship',
      required: true,
      index: true
    },
    location: { type: String, default: 'Remote' },
    description: { type: String, required: true },
    requirements: { type: [String], default: [] },
    applicationQuestions: { type: [String], default: [] },
    community: { type: Schema.Types.ObjectId, ref: 'Community', default: null, index: true },
    deadline: { type: String, default: '' },
    applyUrl: { type: String, default: '' },
    isPlacementDrive: { type: Boolean, default: false, index: true },
    companyDetails: { website: String, description: String, contactEmail: String },
    requiredSkills: { type: [String], default: [] },
    minimumCgpa: { type: Number, min: 0, max: 10 },
    eligibleBranches: { type: [String], default: [] },
    eligibleBatches: { type: [String], default: [] },
    requiresResume: { type: Boolean, default: false },
    package: { type: String, default: '' },
    applicationDeadline: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }
  },
  { timestamps: true }
);

OpportunitySchema.index({ institution: 1, isPlacementDrive: 1, isActive: 1, applicationDeadline: 1 });

export const Opportunity = mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
