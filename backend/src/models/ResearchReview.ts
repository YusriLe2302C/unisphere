import mongoose, { Document, Schema, Types } from 'mongoose';

export type ReviewVerdict = 'approved' | 'changes_requested' | 'rejected';
export type ReviewerRole = 'proctor' | 'project_guide';

export interface ICriteriaScores {
  novelty?: number;
  methodology?: number;
  clarity?: number;
  ethicalCompliance?: boolean;
}

export interface IResearchReview extends Document {
  _id: Types.ObjectId;
  paperId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  reviewerRole: ReviewerRole;
  verdict: ReviewVerdict;
  comments: string;
  criteriaScores?: ICriteriaScores;
  reviewedAt: Date;
  revisionRound: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResearchReviewSchema = new Schema<IResearchReview>(
  {
    paperId: { type: Schema.Types.ObjectId, ref: 'ResearchPaper', required: true, index: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewerRole: {
      type: String,
      enum: ['proctor', 'project_guide'],
      required: true,
      index: true
    },
    verdict: {
      type: String,
      enum: ['approved', 'changes_requested', 'rejected'],
      required: true
    },
    comments: { type: String, required: true },
    criteriaScores: {
      novelty: { type: Number, min: 1, max: 10 },
      methodology: { type: Number, min: 1, max: 10 },
      clarity: { type: Number, min: 1, max: 10 },
      ethicalCompliance: { type: Boolean, default: true }
    },
    reviewedAt: { type: Date, default: Date.now },
    revisionRound: { type: Number, default: 1 }
  },
  { timestamps: true }
);

// Compound Unique index: prevents double-scoring per revision round by the same reviewer
ResearchReviewSchema.index(
  { paperId: 1, reviewerId: 1, revisionRound: 1 },
  { unique: true }
);
ResearchReviewSchema.index({ paperId: 1, revisionRound: 1, reviewerRole: 1 });
ResearchReviewSchema.index({ reviewerId: 1, reviewedAt: -1 });

export const ResearchReview = mongoose.model<IResearchReview>(
  'ResearchReview',
  ResearchReviewSchema
);

