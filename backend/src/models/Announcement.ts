import mongoose, { Document, Schema, Types } from 'mongoose';

export type AnnouncementAudience = 'all' | 'students' | 'faculty' | 'alumni';

export interface IAnnouncement extends Document {
  _id: Types.ObjectId;
  title: string;
  content: string;
  author: Types.ObjectId;
  // Targeting
  institution: string;
  targetAudience: AnnouncementAudience;
  targetRoles: string[];
  targetDepartments: string[];
  targetAcademicYears: string[];
  targetSemesters: number[];
  targetSections: string[];
  // Meta
  category: string;
  attachments: Types.ObjectId[];
  isPinned: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    institution: { type: String, required: true, index: true },
    targetAudience: {
      type: String,
      enum: ['all', 'students', 'faculty', 'alumni'],
      default: 'all'
    },
    targetRoles: { type: [String], default: [] },
    targetDepartments: { type: [String], default: [] },
    targetAcademicYears: { type: [String], default: [] },
    targetSemesters: { type: [Number], default: [] },
    targetSections: { type: [String], default: [] },
    category: { type: String, default: 'General' },
    attachments: [{ type: Schema.Types.ObjectId, ref: 'UploadedFile' }],
    isPinned: { type: Boolean, default: false },
    expiresAt: { type: Date }
  },
  { timestamps: true }
);

AnnouncementSchema.index({ institution: 1, createdAt: -1 });
AnnouncementSchema.index({ author: 1, createdAt: -1 });

export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
