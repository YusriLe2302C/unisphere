import mongoose, { Document, Schema, Types } from 'mongoose';

// ── Status types ──────────────────────────────────────────────────────────────

export type EventLifecycleStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'ongoing'
  | 'completed'
  | 'cancelled';

export type EventMode = 'in_person' | 'online' | 'hybrid';

export type EventAudience = 'all' | 'students' | 'faculty' | 'alumni' | 'institution_only';

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface IEventScheduleItem {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  speaker?: string;
  venue?: string;
}

export interface IEventCoordinator {
  userId: Types.ObjectId;
  name: string;
  role: string;
  contactEmail?: string;
}

export interface IEventSponsor {
  name: string;
  tier: 'title' | 'gold' | 'silver' | 'bronze' | 'partner';
  logoUrl?: string;
  websiteUrl?: string;
}

export interface IEventFile {
  _id?: Types.ObjectId;
  fileId: Types.ObjectId;
  fileType: 'flyer' | 'brochure' | 'agenda' | 'gallery' | 'other';
  url: string;
  originalName: string;
  uploadedAt: Date;
}

export interface IEventEligibility {
  targetInstitutions: string[];
  targetDepartments: string[];
  targetBatches: string[];
  targetSemesters: number[];
  targetRoles: string[];
  minCgpa?: number;
  customCriteria?: string;
}

// ── Main interface ────────────────────────────────────────────────────────────

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  institution: string;
  organizer: Types.ObjectId;

  // Lifecycle
  status: EventLifecycleStatus;
  rejectionReason?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  publishedAt?: Date;
  cancellationReason?: string;
  cancelledBy?: Types.ObjectId;
  cancelledAt?: Date;

  // Event details
  mode: EventMode;
  venue?: string;
  onlineMeetingUrl?: string;
  startDate: Date;
  endDate: Date;
  registrationOpenDate?: Date;
  registrationCloseDate?: Date;

  // Audience & eligibility
  audience: EventAudience;
  eligibility: IEventEligibility;
  rules: string[];

  // Capacity
  capacity: number;           // 0 = unlimited
  allocatedSeats: number;     // canonical running count of confirmed seats
  registrationLockVersion: number;
  isTeamEvent: boolean;
  minTeamSize: number;
  maxTeamSize: number;
  allowWaitlist: boolean;

  // People
  coordinators: IEventCoordinator[];
  sponsors: IEventSponsor[];

  // Files
  flyerUrl?: string;          // mandatory flyer (URL reference)
  files: IEventFile[];

  // Schedule
  schedule: IEventScheduleItem[];

  // Tags / category
  category: string;
  tags: string[];
  // Stable idempotency keys for registration requests; bounded by periodic cleanup.
  idempotencyKeys: Array<{ key: string; userId: Types.ObjectId; registrationId: Types.ObjectId; createdAt: Date }>;

  // Community link (optional)
  community?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const ScheduleItemSchema = new Schema<IEventScheduleItem>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    speaker: { type: String, default: '' },
    venue: { type: String, default: '' }
  },
  { _id: true }
);

const CoordinatorSchema = new Schema<IEventCoordinator>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'Coordinator' },
    contactEmail: { type: String, default: '' }
  },
  { _id: false }
);

const SponsorSchema = new Schema<IEventSponsor>(
  {
    name: { type: String, required: true },
    tier: {
      type: String,
      enum: ['title', 'gold', 'silver', 'bronze', 'partner'],
      default: 'partner'
    },
    logoUrl: { type: String, default: '' },
    websiteUrl: { type: String, default: '' }
  },
  { _id: false }
);

const EventFileSchema = new Schema<IEventFile>(
  {
    fileId: { type: Schema.Types.ObjectId, ref: 'UploadedFile' },
    fileType: {
      type: String,
      enum: ['flyer', 'brochure', 'agenda', 'gallery', 'other'],
      required: true
    },
    url: { type: String, required: true },
    originalName: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const EligibilitySchema = new Schema<IEventEligibility>(
  {
    targetInstitutions: { type: [String], default: [] },
    targetDepartments: { type: [String], default: [] },
    targetBatches: { type: [String], default: [] },
    targetSemesters: { type: [Number], default: [] },
    targetRoles: { type: [String], default: [] },
    minCgpa: { type: Number },
    customCriteria: { type: String, default: '' }
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    institution: { type: String, required: true, index: true },
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected', 'published', 'ongoing', 'completed', 'cancelled'],
      default: 'draft',
      index: true
    },
    rejectionReason: { type: String, default: '' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    publishedAt: { type: Date },
    cancellationReason: { type: String, default: '' },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },

    mode: {
      type: String,
      enum: ['in_person', 'online', 'hybrid'],
      default: 'in_person'
    },
    venue: { type: String, default: '' },
    onlineMeetingUrl: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationOpenDate: { type: Date },
    registrationCloseDate: { type: Date },

    audience: {
      type: String,
      enum: ['all', 'students', 'faculty', 'alumni', 'institution_only'],
      default: 'all'
    },
    eligibility: { type: EligibilitySchema, default: () => ({}) },
    rules: { type: [String], default: [] },

    capacity: { type: Number, default: 0, min: 0 },
    allocatedSeats: { type: Number, default: 0, min: 0 },
    registrationLockVersion: { type: Number, default: 0, min: 0 },
    isTeamEvent: { type: Boolean, default: false },
    minTeamSize: { type: Number, default: 1, min: 1 },
    maxTeamSize: { type: Number, default: 1, min: 1 },
    allowWaitlist: { type: Boolean, default: true },

    coordinators: { type: [CoordinatorSchema], default: [] },
    sponsors: { type: [SponsorSchema], default: [] },

    flyerUrl: { type: String, default: '' },
    files: { type: [EventFileSchema], default: [] },
    schedule: { type: [ScheduleItemSchema], default: [] },

    category: { type: String, default: 'General', index: true },
    tags: { type: [String], default: [] },
    idempotencyKeys: { type: [{ key: String, userId: { type: Schema.Types.ObjectId, ref: 'User' }, registrationId: { type: Schema.Types.ObjectId, ref: 'EventRegistration' }, createdAt: { type: Date, default: Date.now } }], default: [], select: false },
    community: { type: Schema.Types.ObjectId, ref: 'Community', default: null }
  },
  { timestamps: true }
);

EventSchema.index({ institution: 1, status: 1, startDate: 1 });
EventSchema.index({ organizer: 1, createdAt: -1 });
EventSchema.index({ startDate: 1, endDate: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
