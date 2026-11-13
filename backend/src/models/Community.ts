import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICommunityAnnouncement {
  _id?: Types.ObjectId;
  title: string;
  content: string;
  author: Types.ObjectId;
  createdAt: Date;
}

export interface ICommunityResource {
  _id?: Types.ObjectId;
  title: string;
  url: string;
  description?: string;
  type?: string;
  addedBy: Types.ObjectId;
  createdAt: Date;
}

export interface ICommunity extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  category: string;
  banner: string;
  avatar: string;
  creator: Types.ObjectId;
  members: Types.ObjectId[];
  moderators: Types.ObjectId[];
  rules: string[];
  announcements: ICommunityAnnouncement[];
  resources: ICommunityResource[];
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<ICommunityAnnouncement>({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const ResourceSchema = new Schema<ICommunityResource>({
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, default: 'Document' },
  addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const CommunitySchema = new Schema<ICommunity>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    category: { type: String, required: true, default: 'General' },
    banner: {
      type: String,
      default: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80'
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80'
    },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    moderators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    rules: { type: [String], default: ['Be respectful and collaborative', 'No spam or self-promotion without context'] },
    announcements: { type: [AnnouncementSchema], default: [] },
    resources: { type: [ResourceSchema], default: [] }
  },
  { timestamps: true }
);

export const Community = mongoose.model<ICommunity>('Community', CommunitySchema);
