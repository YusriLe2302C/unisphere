import mongoose, { Document, Schema, Types } from 'mongoose';

export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface IConnection extends Document {
  _id: Types.ObjectId;
  canonicalPair: string;
  requester: Types.ObjectId;
  recipient: Types.ObjectId;
  status: ConnectionStatus;
  actionBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<IConnection>(
  {
    canonicalPair: { type: String, required: true, unique: true },
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'blocked'],
      default: 'pending',
      index: true
    },
    actionBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

ConnectionSchema.index({ requester: 1, status: 1 });
ConnectionSchema.index({ recipient: 1, status: 1 });

export const getCanonicalPair = (userA: string | Types.ObjectId, userB: string | Types.ObjectId): string => {
  const a = userA.toString();
  const b = userB.toString();
  return a < b ? `${a}:${b}` : `${b}:${a}`;
};

export const Connection = mongoose.model<IConnection>('Connection', ConnectionSchema);

