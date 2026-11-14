import mongoose, { Document, Schema, Types } from 'mongoose';

export type SubscriptionTargetType =
  | 'topic'
  | 'community'
  | 'department'
  | 'institution'
  | 'research_subject'
  | 'researcher'
  | 'opportunity_category';

export interface ISubscriptionPreferences {
  inAppAlerts: boolean;
  emailAlerts: boolean;
}

export interface ISubscription extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  targetType: SubscriptionTargetType;
  targetId: string;
  targetName: string;
  preferences: ISubscriptionPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: {
      type: String,
      enum: [
        'topic',
        'community',
        'department',
        'institution',
        'research_subject',
        'researcher',
        'opportunity_category'
      ],
      required: true,
      index: true
    },
    targetId: { type: String, required: true, trim: true, index: true },
    targetName: { type: String, required: true, trim: true },
    preferences: {
      inAppAlerts: { type: Boolean, default: true },
      emailAlerts: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

// Unique compound index: prevents duplicate subscription records for the same user + targetType + targetId
SubscriptionSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
