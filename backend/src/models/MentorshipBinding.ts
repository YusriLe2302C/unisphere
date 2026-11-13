import mongoose, { Document, Schema, Types } from 'mongoose';

export type MentorshipType = 'proctor' | 'project_guide';
export type MentorshipStatus = 'active' | 'transferred' | 'terminated';

export interface IMentorshipBinding extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  faculty: Types.ObjectId;
  assignmentType: MentorshipType;
  collaborationId?: Types.ObjectId;
  department: string;
  institution: string;
  collegeId?: string;
  status: MentorshipStatus;
  assignedAt: Date;
  terminatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MentorshipBindingSchema = new Schema<IMentorshipBinding>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    faculty: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignmentType: {
      type: String,
      enum: ['proctor', 'project_guide'],
      required: true,
      index: true
    },
    collaborationId: {
      type: Schema.Types.ObjectId,
      ref: 'ResearchCollaboration',
      index: true
    },
    department: { type: String, required: true },
    institution: { type: String, required: true },
    collegeId: { type: String },
    status: {
      type: String,
      enum: ['active', 'transferred', 'terminated'],
      default: 'active',
      index: true
    },
    assignedAt: { type: Date, default: Date.now },
    terminatedAt: { type: Date }
  },
  { timestamps: true }
);

// Partial Unique Index 1: Exactly 1 active proctor per student
MentorshipBindingSchema.index(
  { student: 1, assignmentType: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { assignmentType: 'proctor', status: 'active' }
  }
);

// Project guides are scoped to the student plus optional collaboration; multiple active guides are allowed per scope.
MentorshipBindingSchema.index(
  { student: 1, collaborationId: 1, assignmentType: 1, faculty: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { assignmentType: 'project_guide', status: 'active' }
  }
);

MentorshipBindingSchema.index({ faculty: 1, status: 1 });

export const MentorshipBinding = mongoose.model<IMentorshipBinding>(
  'MentorshipBinding',
  MentorshipBindingSchema
);

