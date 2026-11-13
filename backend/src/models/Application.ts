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
  resumeFileId?: Types.ObjectId;
  reviewerNotes?: string;
  idempotencyKey?: string;
  interviewRounds: Array<{ name: string; scheduledAt?: Date; status: 'scheduled'|'completed'|'cancelled'; notes?: string }>;
  selectionStatus: 'pending'|'selected'|'not_selected'|'waitlisted';
  offerStatus: 'not_issued'|'issued'|'accepted'|'declined'|'expired';
  history: Array<{ status: string; changedBy: Types.ObjectId; note?: string; changedAt: Date }>;
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
    resumeFileId: { type: Schema.Types.ObjectId, ref: 'UploadedFile' },
    reviewerNotes: { type: String, default: '' },
    idempotencyKey: { type: String, trim: true },
    interviewRounds: [{ name: { type: String, required: true }, scheduledAt: Date, status: { type: String, enum: ['scheduled','completed','cancelled'], default: 'scheduled' }, notes: String }],
    selectionStatus: { type: String, enum: ['pending','selected','not_selected','waitlisted'], default: 'pending' },
    offerStatus: { type: String, enum: ['not_issued','issued','accepted','declined','expired'], default: 'not_issued' },
    history: [{ status: String, changedBy: { type: Schema.Types.ObjectId, ref: 'User' }, note: String, changedAt: { type: Date, default: Date.now } }]
  },
  { timestamps: true }
);

// Compound index to prevent duplicate submissions from the same user for the same opportunity
ApplicationSchema.index({ applicant: 1, opportunity: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

export const Application = mongoose.model<IApplication>('Application', ApplicationSchema);
