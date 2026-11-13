import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IComment {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  content: string;
  replies: ICommentReply[];
  createdAt?: Date;
}

export interface ICommentReply {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  content: string;
  createdAt?: Date;
}

export type EventApprovalStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type EventPublicationStatus =
  | 'unannounced'
  | 'published'
  | 'hidden';

export type RegistrationStatus =
  | 'registered'
  | 'waitlisted'
  | 'cancelled'
  | 'attended';

export interface IEventRegistration {
  userId: Types.ObjectId;
  registeredAt: Date;
  status: RegistrationStatus;
  teamName?: string;
  teamMembers: Types.ObjectId[];
  seatsAllocated: number;
  attendanceMarked: boolean;
  attendedAt?: Date;
  ticketCode: string;
}

export interface IWaitlistEntry {
  userId: Types.ObjectId;
  teamName?: string;
  teamMembers: Types.ObjectId[];
  seatsRequested: number;
  waitlistedAt: Date;
}

export interface IEventDetails {
  venue?: string;
  startDate?: Date;
  endDate?: Date;
  organizer?: string;
  capacity?: number;
  allocatedSeats?: number;
  registrationDeadline?: Date;
  isVirtual?: boolean;
  virtualMeetingUrl?: string;
  isTeamEvent?: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  allowWaitlist?: boolean;
  approvalStatus?: EventApprovalStatus;
  publicationStatus?: EventPublicationStatus;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  targetColleges?: string[];
  targetDepartments?: string[];
  targetBatches?: string[];
  registrations?: IEventRegistration[];
  waitlist?: IWaitlistEntry[] | Types.ObjectId[];
  isCancelled?: boolean;
  cancellationReason?: string;
  // Backward compatibility fields
  registeredAttendees?: Types.ObjectId[];
  attendedAttendees?: Types.ObjectId[];
  sportsDetails?: {
    sportType?: string;
    teams?: string[];
    matchType?: string;
    resultScore?: string;
  };
}

export type PostCategory =
  | 'General'
  | 'Research'
  | 'Project'
  | 'Achievement'
  | 'Opportunity'
  | 'Question'
  | 'Campus Announcement'
  | 'Hackathon'
  | 'Official Circular'
  | 'Event'
  | 'Cultural Fest'
  | 'Workshop & Seminar'
  | 'Sports & Fixtures'
  | 'Club Activity'
  | 'Academic Notice'
  | 'Exam & Deadline';

export interface IPost extends Document {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  title?: string;
  content: string;
  category: PostCategory;
  institution?: string;
  audience: 'all' | 'students' | 'faculty' | 'alumni';
  visibility: 'public' | 'institution-only';
  tags: string[];
  community?: Types.ObjectId | null;
  likes: Types.ObjectId[];
  dislikes: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
  sharesCount: number;
  comments: IComment[];
  mediaUrl?: string;
  attachments?: Types.ObjectId[];
  deadline?: string;
  isPinned?: boolean;
  isSolved?: boolean;
  eventDetails?: IEventDetails;
  createdAt: Date;
  updatedAt: Date;
}

const CommentReplySchema = new Schema<ICommentReply>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

const CommentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    replies: { type: [CommentReplySchema], default: [] }
  },
  { timestamps: true }
);

const EventRegistrationSchema = new Schema<IEventRegistration>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    registeredAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['registered', 'waitlisted', 'cancelled', 'attended'],
      default: 'registered'
    },
    teamName: { type: String },
    teamMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    seatsAllocated: { type: Number, default: 1 },
    attendanceMarked: { type: Boolean, default: false },
    attendedAt: { type: Date },
    ticketCode: { type: String, required: true }
  },
  { _id: false }
);

const WaitlistEntrySchema = new Schema<IWaitlistEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teamName: { type: String },
    teamMembers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    seatsRequested: { type: Number, default: 1 },
    waitlistedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const EventDetailsSchema = new Schema<IEventDetails>(
  {
    venue: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    organizer: { type: String, default: '' },
    capacity: { type: Number, default: 0 },
    allocatedSeats: { type: Number, default: 0 },
    registrationDeadline: { type: Date },
    isVirtual: { type: Boolean, default: false },
    virtualMeetingUrl: { type: String, default: '' },
    isTeamEvent: { type: Boolean, default: false },
    minTeamSize: { type: Number, default: 1 },
    maxTeamSize: { type: Number, default: 1 },
    allowWaitlist: { type: Boolean, default: true },
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected', 'cancelled'],
      default: 'approved'
    },
    publicationStatus: {
      type: String,
      enum: ['unannounced', 'published', 'hidden'],
      default: 'published'
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    targetColleges: { type: [String], default: [] },
    targetDepartments: { type: [String], default: [] },
    targetBatches: { type: [String], default: [] },
    registrations: { type: [EventRegistrationSchema], default: [] },
    waitlist: { type: [WaitlistEntrySchema], default: [] },
    isCancelled: { type: Boolean, default: false },
    cancellationReason: { type: String, default: '' },
    // Backward compatibility
    registeredAttendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    attendedAttendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    sportsDetails: {
      sportType: { type: String, default: '' },
      teams: { type: [String], default: [] },
      matchType: { type: String, default: '' },
      resultScore: { type: String, default: '' }
    }
  },
  { _id: false }
);

const PostSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: '', trim: true },
    content: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        'General',
        'Research',
        'Project',
        'Achievement',
        'Opportunity',
        'Question',
        'Campus Announcement',
        'Hackathon',
        'Official Circular',
        'Event',
        'Cultural Fest',
        'Workshop & Seminar',
        'Sports & Fixtures',
        'Club Activity',
        'Academic Notice',
        'Exam & Deadline'
      ],
      default: 'General',
      index: true
    },
    institution: { type: String, default: '', index: true },
    audience: {
      type: String,
      enum: ['all', 'students', 'faculty', 'alumni'],
      default: 'all',
      index: true
    },
    visibility: {
      type: String,
      enum: ['public', 'institution-only'],
      default: 'public',
      index: true
    },
    tags: { type: [String], default: [] },
    community: { type: Schema.Types.ObjectId, ref: 'Community', default: null, index: true },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    sharesCount: { type: Number, default: 0 },
    comments: { type: [CommentSchema], default: [] },
    mediaUrl: { type: String, default: '' },
    attachments: [{ type: Schema.Types.ObjectId, ref: 'UploadedFile' }],
    deadline: { type: String, default: '' },
    isPinned: { type: Boolean, default: false },
    isSolved: { type: Boolean, default: false },
    eventDetails: { type: EventDetailsSchema, default: null }
  },
  { timestamps: true }
);

// Indexes
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ institution: 1, createdAt: -1 });
PostSchema.index({ community: 1, createdAt: -1 });
PostSchema.index(
  {
    'eventDetails.approvalStatus': 1,
    'eventDetails.publicationStatus': 1,
    'eventDetails.startDate': 1
  },
  { partialFilterExpression: { category: 'Event' } }
);
PostSchema.index(
  { 'eventDetails.registrations.ticketCode': 1 },
  { unique: true, sparse: true }
);

export const Post = mongoose.model<IPost>('Post', PostSchema);
