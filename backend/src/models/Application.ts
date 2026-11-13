import mongoose, { Document, Schema, Types } from 'mongoose';

export type ApplicationStatus = 
  | 'applied' 
  | 'under_review' 
  | 'shortlisted' 
  | 'accepted' 
  | 'rejected' 
  | 'withdrawn';

export interface IApplicationAnswer {
  question: string;
  answer: string;
}

export interface IApplication extends Document {
  _id: Types.ObjectId;
  applicant: Types.ObjectId;
  opportunity: Types.ObjectId;
  roleApplied: string;
  answers: IApplicationAnswer[];
  status: ApplicationStatus;
  note: string;
  resumeLink?: string;
  reviewerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationAnswerSchema = new Schema<IApplicationAnswer>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true }
  },
  { _id: false }
);

const ApplicationSchema = new Schema<IApplication>(
  {
    applicant: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    opportunity: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true, index: true },
    roleApplied: { type: String, required: true },
    answers: { type: [ApplicationAnswerSchema], default: [] },
    status: {
      type: String,
      enum: ['applied', 'under_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn'],
      default: 'applied',
      index: true
    },
    note: { type: String, default: '' },
    resumeLink: { type: String, default: '' },
    reviewerNotes: { type: String, default: '' }
  },
  { timestamps: true }
);

// Compound index to prevent duplicate submissions from the same user for the same opportunity
ApplicationSchema.index({ applicant: 1, opportunity: 1 }, { unique: true });

export const Application = mongoose.model<IApplication>('Application', ApplicationSchema);
