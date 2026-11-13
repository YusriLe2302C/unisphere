import mongoose, { Document, Schema, Types } from 'mongoose';

export type CalendarEventType =
  | 'semester_start'
  | 'semester_end'
  | 'exam'
  | 'internal_assessment'
  | 'academic_deadline'
  | 'college_event'
  | 'holiday'
  | 'cultural_fest'
  | 'sports_meet'
  | 'workshop'
  | 'registration_deadline'
  | 'other';

export interface IAcademicEvent {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  type: CalendarEventType;
  startDate: Date;
  endDate: Date;
  isHoliday: boolean;
  targetDepartments?: string[];
  targetBatches?: string[];
}

export interface IAcademicCalendar extends Document {
  _id: Types.ObjectId;
  institution: string;
  collegeId?: string;
  academicYear: string;
  semesterType: 'odd' | 'even' | 'annual';
  events: IAcademicEvent[];
  createdBy: Types.ObjectId;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicEventSchema = new Schema<IAcademicEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: [
        'semester_start',
        'semester_end',
        'exam',
        'internal_assessment',
        'academic_deadline',
        'college_event',
        'holiday',
        'cultural_fest',
        'sports_meet',
        'workshop',
        'registration_deadline',
        'other'
      ],
      default: 'other'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isHoliday: { type: Boolean, default: false },
    targetDepartments: { type: [String], default: [] },
    targetBatches: { type: [String], default: [] }
  },
  { _id: true }
);

const AcademicCalendarSchema = new Schema<IAcademicCalendar>(
  {
    institution: { type: String, required: true, trim: true, index: true },
    collegeId: { type: String, trim: true, index: true },
    academicYear: { type: String, required: true, trim: true },
    semesterType: {
      type: String,
      enum: ['odd', 'even', 'annual'],
      required: true
    },
    events: { type: [AcademicEventSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

AcademicCalendarSchema.index(
  { institution: 1, academicYear: 1, semesterType: 1 },
  { unique: true }
);

export const AcademicCalendar = mongoose.model<IAcademicCalendar>(
  'AcademicCalendar',
  AcademicCalendarSchema
);

