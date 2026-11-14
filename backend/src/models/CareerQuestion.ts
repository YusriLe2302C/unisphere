import mongoose, { Document, Schema, Types } from 'mongoose';

export type QuestionVisibility = 'public' | 'private_to_mentor';

export interface ICareerAnswer {
  _id?: Types.ObjectId;
  responder: Types.ObjectId;
  content: string;
  isVerifiedFaculty: boolean;
  isEndorsed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICareerQuestion extends Document {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  assignedMentor?: Types.ObjectId;
  visibility: QuestionVisibility;
  title: string;
  body: string;
  attachmentIds: Types.ObjectId[];
  followUps: Array<{ author: Types.ObjectId; content: string; createdAt: Date }>;
  tags: string[];
  targetDepartments: string[];
  institution?: string;
  answers: ICareerAnswer[];
  isClosed: boolean;
  flaggedForModeration: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CareerAnswerSchema = new Schema<ICareerAnswer>(
  {
    responder: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    isVerifiedFaculty: { type: Boolean, default: false },
    isEndorsed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const CareerQuestionSchema = new Schema<ICareerQuestion>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedMentor: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    visibility: {
      type: String,
      enum: ['public', 'private_to_mentor'],
      default: 'public',
      index: true
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    attachmentIds: { type: [{ type: Schema.Types.ObjectId, ref: 'UploadedFile' }], select: false, default: [] },
    followUps: [{ author: { type: Schema.Types.ObjectId, ref: 'User', required: true }, content: { type: String, required: true }, createdAt: { type: Date, default: Date.now } }],
    tags: { type: [String], default: [] },
    targetDepartments: { type: [String], default: [] },
    institution: { type: String, index: true },
    answers: { type: [CareerAnswerSchema], default: [] },
    isClosed: { type: Boolean, default: false, index: true },
    flaggedForModeration: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

CareerQuestionSchema.index({ visibility: 1, targetDepartments: 1, createdAt: -1 });
CareerQuestionSchema.index({ assignedMentor: 1, visibility: 1, isClosed: 1 });
CareerQuestionSchema.index({ author: 1, createdAt: -1 });

export const CareerQuestion = mongoose.model<ICareerQuestion>(
  'CareerQuestion',
  CareerQuestionSchema
);

