import mongoose, { Document, Schema, Types } from 'mongoose';

export type PublicationType = 
  | 'Journal Paper' 
  | 'Conference Proceeding' 
  | 'Conference Paper'
  | 'Preprint' 
  | 'Patent' 
  | 'Dataset' 
  | 'Technical Report';

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
  publicationType: PublicationType;
  subject: string;
  doi?: string;
  externalUrl?: string;
  pdfUrl?: string;
  datasetUrl?: string;
  publicationDate: Date;
  tags: string[];
  institution: string;
  visibility: 'public' | 'institution-only';
  submittedBy: Types.ObjectId;
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
    publicationType: {
      type: String,
      enum: ['Journal Paper', 'Conference Proceeding', 'Conference Paper', 'Preprint', 'Patent', 'Dataset', 'Technical Report'],
      default: 'Preprint',
      index: true
    },
    subject: { type: String, required: true, index: true },
    doi: { type: String, default: '', trim: true, index: true },
    externalUrl: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
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
    citations: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const ResearchPaper = mongoose.model<IResearchPaper>('ResearchPaper', ResearchPaperSchema);
