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
    | 'calendar_change'
    | 'research_publication'
    | 'collaboration_invite'
    | 'collaboration_request'
    | 'collaboration_status';
  message: string;
  entityId?: string;
  isRead: boolean;
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt?: Date;
  nextAttemptAt?: Date;
  failureReason?: string;
  idempotencyKey?: string;
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
        'calendar_change',
        'research_publication',
        'collaboration_invite',
        'collaboration_request',
        'collaboration_status'
      ],
      default: 'system'
    },
    message: { type: String, required: true },
    entityId: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    deliveryStatus: { type: String, enum: ['pending','delivered','failed'], default: 'pending', index: true },
    attempts: { type: Number, default: 0, min: 0 },
    lastAttemptAt: Date,
    nextAttemptAt: Date,
    failureReason: { type: String, default: '' },
    idempotencyKey: { type: String, trim: true }
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

const NotificationPreferenceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  inAppAlerts: { type: Boolean, default: true },
  opportunityAlerts: { type: Boolean, default: true },
  eventAlerts: { type: Boolean, default: true },
  researchAlerts: { type: Boolean, default: true },
  communityAlerts: { type: Boolean, default: true },
  messagingAlerts: { type: Boolean, default: true }
}, { timestamps: true });

export const NotificationPreference = mongoose.models.NotificationPreference || mongoose.model('NotificationPreference', NotificationPreferenceSchema);
