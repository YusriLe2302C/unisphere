import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  type: 
    | 'like' 
    | 'comment' 
    | 'follow' 
    | 'community_join' 
    | 'opportunity' 
    | 'system' 
    | 'event_registration' 
    | 'application_status'
    | 'subscription_content'
    | 'announcement'
    | 'schedule_change'
    | 'research_publication'
    | 'collaboration_invite'
    | 'collaboration_request'
    | 'collaboration_status';
  message: string;
  entityId?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'like', 
        'comment', 
        'follow', 
        'community_join', 
        'opportunity', 
        'system', 
        'event_registration', 
        'application_status',
        'subscription_content',
        'announcement',
        'schedule_change',
        'research_publication',
        'collaboration_invite',
        'collaboration_request',
        'collaboration_status'
      ],
      default: 'system'
    },
    message: { type: String, required: true },
    entityId: { type: String, default: '' },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
