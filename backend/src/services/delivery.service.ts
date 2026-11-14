import { Types } from 'mongoose';
import { Subscription, SubscriptionTargetType } from '../models/Subscription.js';
import { Notification } from '../models/Notification.js';
import { Community } from '../models/Community.js';
import { User } from '../models/User.js';
import { platformConfig } from '../config/platform.config.js';
import { emitNotification } from './realtime.service.js';

export interface IDeliveryTarget {
  targetType: SubscriptionTargetType;
  targetId: string;
}

export interface IDeliverContentParams {
  targets?: IDeliveryTarget[];
  senderId: Types.ObjectId | string;
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
    | 'calendar_change'
    | 'system';
  message: string;
  entityId: string;
  institution?: string;
  visibility?: 'public' | 'institution-only';
  communityId?: Types.ObjectId | string;
  specificRecipients?: Array<Types.ObjectId | string>;
  excludeUserIds?: Array<Types.ObjectId | string>;
}

export class DeliveryService {
  /**
   * Distributes in-app alerts to subscribed users and community members
   * respecting visibility, institutions, preferences, and 24h deduplication.
   */
  static async deliverContentNotification(params: IDeliverContentParams): Promise<number> {
    try {
      const recipientIds = new Set<string>();

      // 1. If explicit recipients provided
      if (params.specificRecipients && params.specificRecipients.length > 0) {
        params.specificRecipients.forEach(id => recipientIds.add(id.toString()));
      }

      // 2. Query subscribers by targets
      if (params.targets && params.targets.length > 0) {
        const queryOr = params.targets.map(t => ({
          targetType: t.targetType,
          targetId: t.targetId.trim()
        }));

        const matchingSubs = await Subscription.find({
          'preferences.inAppAlerts': { $ne: false },
          $or: queryOr
        }).select('user');

        matchingSubs.forEach(sub => recipientIds.add(sub.user.toString()));
      }

      // 3. If communityId provided, include community members
      if (params.communityId) {
        const comm = await Community.findById(params.communityId).select('members');
        if (comm && comm.members) {
          comm.members.forEach(m => recipientIds.add(m.toString()));
        }
      }

      // 4. Remove sender and explicitly excluded users
      recipientIds.delete(params.senderId.toString());
      if (params.excludeUserIds) {
        params.excludeUserIds.forEach(id => recipientIds.delete(id.toString()));
      }

      if (recipientIds.size === 0) {
        return 0;
      }

      const candidateIds = Array.from(recipientIds).map(id => new Types.ObjectId(id));

      // 5. Check institutional visibility rules and user notification preferences
      const userQuery: any = { _id: { $in: candidateIds } };
      if (params.visibility === 'institution-only' && params.institution && platformConfig.mode === 'single-college') {
        userQuery.institution = params.institution;
      }

      // Check global inAppAlerts toggle
      userQuery['notificationPreferences.inAppAlerts'] = { $ne: false };

      // Map notification type to specific category preference
      if (params.type === 'opportunity' || params.type === 'application_status') {
        userQuery['notificationPreferences.opportunityAlerts'] = { $ne: false };
      } else if (params.type === 'event_registration' || params.type === 'schedule_change' || params.type === 'calendar_change') {
        userQuery['notificationPreferences.eventAlerts'] = { $ne: false };
      } else if (params.type === 'research_publication') {
        userQuery['notificationPreferences.researchAlerts'] = { $ne: false };
      } else if (params.type === 'community_join' || params.type === 'announcement') {
        userQuery['notificationPreferences.communityAlerts'] = { $ne: false };
      }
      if (params.type === 'system') userQuery['notificationPreferences.messagingAlerts'] = { $ne: false };

      const validUsers = await User.find(userQuery).select('_id');
      const finalRecipientIds = validUsers.map(u => u._id);

      if (finalRecipientIds.length === 0) {
        return 0;
      }

      // 6. Deduplicate against existing notifications within the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existingNotifs = await Notification.find({
        recipient: { $in: finalRecipientIds },
        entityId: params.entityId,
        type: params.type,
        createdAt: { $gte: twentyFourHoursAgo }
      }).select('recipient');

      const alreadyNotified = new Set(existingNotifs.map(n => n.recipient.toString()));
      const toInsert = finalRecipientIds
        .filter(id => !alreadyNotified.has(id.toString()))
        .map(recipientId => ({
          recipient: recipientId,
          sender: new Types.ObjectId(params.senderId.toString()),
          type: params.type,
          entityId: params.entityId,
          message: params.message,
          isRead: false,
          deliveryStatus: 'pending',
          attempts: 0,
          idempotencyKey: `${params.type}:${params.entityId}:${recipientId}`
        }));

      if (toInsert.length > 0) {
        const inserted = await Notification.insertMany(toInsert, { ordered: false });
        for (const notification of inserted) {
          try {
            emitNotification(notification.recipient.toString(), notification);
            notification.deliveryStatus = 'delivered'; notification.attempts += 1; notification.lastAttemptAt = new Date(); notification.failureReason = '';
            await notification.save();
          } catch (e: any) {
            notification.attempts += 1; notification.lastAttemptAt = new Date(); notification.failureReason = String(e?.message || 'Realtime delivery failed').slice(0, 500);
            notification.deliveryStatus = notification.attempts >= 5 ? 'failed' : 'pending'; notification.nextAttemptAt = new Date(Date.now() + Math.min(3600000, 1000 * 2 ** notification.attempts)); await notification.save();
          }
        }
      }

      return toInsert.length;
    } catch (err) {
      console.error('[DeliveryService] Error delivering notifications:', err);
      return 0;
    }
  }
}
