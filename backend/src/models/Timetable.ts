import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITimetableSlot extends Document {
  _id: Types.ObjectId;
  institution: string;
  collegeId?: string;
  department: string;
  semester: number;
  section: string;
  academicYear: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startMinutes: number;
  endMinutes: number;
  courseCode: string;
  courseName: string;
  facultyId: Types.ObjectId;
  roomNumber: string;
  building: string;
  sessionType: 'lecture' | 'laboratory' | 'tutorial' | 'exam';
  effectiveFrom: Date;
  effectiveTo?: Date;
  revision: number;
  publishedAt?: Date;
  createdBy: Types.ObjectId;
  sectionId: string;
  changeSetId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSlotSchema = new Schema<ITimetableSlot>(
  {
    institution: { type: String, required: true, trim: true, index: true },
    collegeId: { type: String, trim: true, index: true },
    department: { type: String, required: true, trim: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    section: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
      index: true
    },
    startMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1440,
      validate: {
        validator: function (this: ITimetableSlot, val: number) {
          return this.endMinutes === undefined || val < this.endMinutes;
        },
        message: 'startMinutes must be strictly less than endMinutes'
      }
    },
    endMinutes: {
      type: Number,
      required: true,
      min: 0,
      max: 1440
    },
    courseCode: { type: String, required: true, trim: true, uppercase: true },
    courseName: { type: String, required: true, trim: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roomNumber: { type: String, required: true, trim: true },
    building: { type: String, default: '', trim: true },
    sessionType: { type: String, enum: ['lecture','laboratory','tutorial','exam'], default: 'lecture', index: true },
    effectiveFrom: { type: Date, default: Date.now, index: true },
    effectiveTo: { type: Date },
    revision: { type: Number, default: 1, min: 1 },
    publishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sectionId: { type: String, required: true, index: true },
    changeSetId: { type: String, index: true },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

// Conflict detection indexes for section, faculty, and room schedule queries
TimetableSlotSchema.index({
  institution: 1,
  department: 1,
  semester: 1,
  section: 1,
  dayOfWeek: 1,
  startMinutes: 1,
  endMinutes: 1
});
TimetableSlotSchema.index({ institution: 1, department: 1, academicYear: 1, semester: 1, section: 1, revision: 1, isActive: 1 });
TimetableSlotSchema.index({ facultyId: 1, dayOfWeek: 1, startMinutes: 1, endMinutes: 1 });
TimetableSlotSchema.index({
  roomNumber: 1,
  building: 1,
  dayOfWeek: 1,
  startMinutes: 1,
  endMinutes: 1
});

export const Timetable = mongoose.model<ITimetableSlot>('Timetable', TimetableSlotSchema);

// A single document per institution/department is atomically incremented before every timetable write.
// This serializes conflict checks even when the database is a standalone MongoDB instance.
const TimetableWriteLockSchema = new Schema({
  institution: { type: String, required: true },
  department: { type: String, required: true },
  version: { type: Number, default: 0 },
  lockOwner: { type: String },
  lockExpiresAt: { type: Date }
}, { timestamps: true });
TimetableWriteLockSchema.index({ institution: 1, department: 1 }, { unique: true });
export const TimetableWriteLock = mongoose.models.TimetableWriteLock || mongoose.model('TimetableWriteLock', TimetableWriteLockSchema);

