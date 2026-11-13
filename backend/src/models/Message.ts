import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMessageReadReceipt {
  userId: Types.ObjectId;
  readAt: Date;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  attachments: Types.ObjectId[];
  readBy: IMessageReadReceipt[];
  deliveredTo: Types.ObjectId[];
  clientMessageId?: string;
  isSystemNotice: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageReadReceiptSchema = new Schema<IMessageReadReceipt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true },
    attachments: [{ type: Schema.Types.ObjectId, ref: 'UploadedFile' }],
    readBy: { type: [MessageReadReceiptSchema], default: [] },
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    clientMessageId: { type: String, trim: true },
    isSystemNotice: { type: Boolean, default: false }
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, 'readBy.userId': 1 });
MessageSchema.index({ sender: 1, clientMessageId: 1 }, { unique: true, sparse: true });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

