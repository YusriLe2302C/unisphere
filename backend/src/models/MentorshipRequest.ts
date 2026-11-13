import mongoose, { Document, Schema, Types } from 'mongoose';

export type MentorshipRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface IMentorshipRequest extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  mentor: Types.ObjectId;
  subject: string;
  message: string;
  goals: string[];
  status: MentorshipRequestStatus;
  responseNote?: string;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  responseMessage?: string;
}

const MentorshipRequestSchema = new Schema<IMentorshipRequest>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    goals: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled'],
      default: 'pending',
      index: true
    },
    responseNote: { type: String, default: '' },
    responseMessage: { type: String, default: '' },
    respondedAt: { type: Date }
  },
  { timestamps: true }
);

MentorshipRequestSchema.index({ student: 1, mentor: 1, status: 1 });
MentorshipRequestSchema.index({ student: 1, mentor: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
MentorshipRequestSchema.index({ mentor: 1, status: 1 });

export const MentorshipRequest = mongoose.model<IMentorshipRequest>(
  'MentorshipRequest',
  MentorshipRequestSchema
);

