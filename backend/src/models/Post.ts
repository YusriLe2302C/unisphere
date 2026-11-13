import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IComment {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  content: string;
  createdAt?: Date;
}

export interface IEventDetails {
  venue?: string;
  startDate?: Date;
  endDate?: Date;
  organizer?: string;
  capacity?: number;
  registeredAttendees?: Types.ObjectId[];
  attendedAttendees?: Types.ObjectId[];
  waitlist?: Types.ObjectId[];
  isCancelled?: boolean;
  cancellationReason?: string;
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
  deadline?: string;
  eventDetails?: IEventDetails;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

const EventDetailsSchema = new Schema<IEventDetails>({
  venue: { type: String, default: '' },
  startDate: { type: Date },
  endDate: { type: Date },
  organizer: { type: String, default: '' },
  capacity: { type: Number, default: 0 },
  registeredAttendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  attendedAttendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  waitlist: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isCancelled: { type: Boolean, default: false },
  cancellationReason: { type: String, default: '' },
  sportsDetails: {
    sportType: { type: String, default: '' },
    teams: { type: [String], default: [] },
    matchType: { type: String, default: '' },
    resultScore: { type: String, default: '' }
  }
}, { _id: false });

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
    deadline: { type: String, default: '' },
    eventDetails: { type: EventDetailsSchema, default: null }
  },
  { timestamps: true }
);

export const Post = mongoose.model<IPost>('Post', PostSchema);
