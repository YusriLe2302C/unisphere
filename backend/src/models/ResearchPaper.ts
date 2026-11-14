import mongoose, { Document, Schema, Types } from 'mongoose';

export type PublicationType =
  | 'Journal Paper'
  | 'Conference Proceeding'
  | 'Conference Paper'
  | 'Preprint'
  | 'Patent'
  | 'Dataset'
  | 'Technical Report';

export type ResearchLifecycleStatus =
  | 'draft'
  | 'submitted'
  | 'pending_proctor'
  | 'pending_guide'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'archived';

export interface IAuthorInfo {
  name: string;
  user?: Types.ObjectId;
  institution?: string;
  email?: string;
}

export interface IResearchPaper extends Document {
  _id: Types.ObjectId;
  title: string;
  abstract: string;
  authors: IAuthorInfo[];
  authorIds?: Types.ObjectId[];
  primaryAuthorId?: Types.ObjectId;
  publicationType: PublicationType;
  subject: string;
  department?: string;
  collegeId?: string;
  doi?: string;
  externalUrl?: string;
  pdfUrl?: string;
  fileAttachmentId?: Types.ObjectId;
  datasetFileId?: Types.ObjectId;
  datasetUrl?: string;
  publicationDate: Date;
  tags: string[];
  institution: string;
  visibility: 'public' | 'institution-only';
  submittedBy: Types.ObjectId;
  isStudentSubmission?: boolean;
  lifecycleStatus?: ResearchLifecycleStatus;
  collaborationId?: Types.ObjectId;
  assignedProctorId?: Types.ObjectId;
  assignedProjectGuideId?: Types.ObjectId;
  assignedProjectGuideIds?: Types.ObjectId[];
  revisionRound?: number;
  reviewHistory?: Array<{ revisionRound: number; submittedAt: Date; submittedBy: Types.ObjectId }>;
  isLegacyPaper?: boolean;
  citations: number;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AuthorInfoSchema = new Schema<IAuthorInfo>(
  {
    name: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    institution: { type: String, default: '' },
    email: { type: String, default: '' }
  },
  { _id: false }
);

const ResearchPaperSchema = new Schema<IResearchPaper>(
  {
    title: { type: String, required: true, trim: true, index: true },
    abstract: { type: String, required: true },
    authors: { type: [AuthorInfoSchema], required: true },
    authorIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    primaryAuthorId: { type: Schema.Types.ObjectId, ref: 'User' },
    publicationType: {
      type: String,
      enum: [
        'Journal Paper',
        'Conference Proceeding',
        'Conference Paper',
        'Preprint',
        'Patent',
        'Dataset',
        'Technical Report'
      ],
      default: 'Preprint',
      index: true
    },
    subject: { type: String, required: true, index: true },
    department: { type: String, default: '', index: true },
    collegeId: { type: String, default: '', index: true },
    doi: { type: String, default: undefined, trim: true },
    externalUrl: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    fileAttachmentId: { type: Schema.Types.ObjectId, ref: 'UploadedFile' },
    datasetFileId: { type: Schema.Types.ObjectId, ref: 'UploadedFile' },
    datasetUrl: { type: String, default: '' },
    publicationDate: { type: Date, default: Date.now },
    tags: { type: [String], default: [] },
    institution: { type: String, default: '', index: true },
    visibility: {
      type: String,
      enum: ['public', 'institution-only'],
      default: 'public',
      index: true
    },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isStudentSubmission: { type: Boolean, default: false },
    lifecycleStatus: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'pending_proctor',
        'pending_guide',
        'approved',
        'rejected',
        'published',
        'archived'
      ],
      default: 'published',
      index: true
    },
    collaborationId: { type: Schema.Types.ObjectId, ref: 'ResearchCollaboration' },
    assignedProctorId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedProjectGuideId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedProjectGuideIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    revisionRound: { type: Number, default: 1, min: 1 },
    reviewHistory: [{ revisionRound: { type: Number, required: true }, submittedAt: { type: Date, default: Date.now }, submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true } }],
    isLegacyPaper: { type: Boolean, default: false },
    citations: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Indexes
ResearchPaperSchema.index({ lifecycleStatus: 1, institution: 1, department: 1 });
ResearchPaperSchema.index({ authorIds: 1, createdAt: -1 });
ResearchPaperSchema.index({ assignedProctorId: 1, lifecycleStatus: 1 }, { sparse: true });
ResearchPaperSchema.index({ assignedProjectGuideId: 1, lifecycleStatus: 1 }, { sparse: true });
ResearchPaperSchema.index({ assignedProjectGuideIds: 1, lifecycleStatus: 1 }, { sparse: true });
ResearchPaperSchema.index({ doi: 1 }, { unique: true, sparse: true });

export const ResearchPaper = mongoose.model<IResearchPaper>('ResearchPaper', ResearchPaperSchema);
