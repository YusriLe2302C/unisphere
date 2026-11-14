import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  isGroup: boolean;
  canonicalDirectPair?: string;
  name?: string;
  participants: Types.ObjectId[];
  admins: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  lastMessageAt?: Date;
  institution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    isGroup: { type: Boolean, default: false },
    canonicalDirectPair: { type: String },
    name: { type: String, trim: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, default: Date.now },
    institution: { type: String }
  },
  { timestamps: true }
);

// Enforce unique 1-on-1 direct conversations between two specific users
ConversationSchema.index(
  { canonicalDirectPair: 1 },
  { unique: true, partialFilterExpression: { isGroup: false } }
);

ConversationSchema.index({ participants: 1, lastMessageAt: -1 });

export const getCanonicalDirectPair = (
  userA: string | Types.ObjectId,
  userB: string | Types.ObjectId
): string => {
  const a = userA.toString();
  const b = userB.toString();
  return a < b ? `${a}:${b}` : `${b}:${a}`;
};

export const Conversation = mongoose.model<IConversation>(
  'Conversation',
  ConversationSchema
);
