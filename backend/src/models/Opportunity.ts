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
    postedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }
  },
  { timestamps: true }
);

export const Opportunity = mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
