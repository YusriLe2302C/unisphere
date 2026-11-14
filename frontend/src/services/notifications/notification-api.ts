import { apiRequest } from '../api';

export type NotificationType =
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
export interface AppNotification {
  _id: string;
  type: NotificationType;
  message: string;
  entityId?: string;
  isRead: boolean;
  deliveryStatus?: string;
  createdAt: string;
  sender?: {
    _id?: string;
    name?: string;
    avatar?: string;
    role?: string;
    headline?: string;
  } | null;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function getNotifications(
  token: string,
  filters: { type?: string; unreadOnly?: boolean; page?: number; limit?: number } = {},
) {
  return apiRequest<NotificationListResponse>('notifications', { token, query: filters });
}

export async function markNotificationRead(token: string, id: string) {
  return apiRequest<{ message: string; notification: AppNotification }>(
    `notifications/${encodeURIComponent(id)}/read`,
    { method: 'PUT', token },
  );
}

export async function markAllNotificationsRead(token: string) {
  return apiRequest<{ message: string }>('notifications/read-all', { method: 'PUT', token });
}

export type NotificationPreferences = Record<
  | 'inAppAlerts'
  | 'opportunityAlerts'
  | 'eventAlerts'
  | 'researchAlerts'
  | 'communityAlerts'
  | 'messagingAlerts',
  boolean
>;
export async function getNotificationPreferences(token: string) {
  return apiRequest<{ preferences: NotificationPreferences }>('notifications/preferences', {
    token,
  });
}
export async function updateNotificationPreferences(
  token: string,
  preferences: Partial<NotificationPreferences>,
) {
  return apiRequest<{ preferences: NotificationPreferences }>('notifications/preferences', {
    method: 'PUT',
    token,
    body: preferences,
  });
}

export function notifyNotificationsUpdated() {
  window.dispatchEvent(new Event('unisphere:notifications-updated'));
}

export async function getUnreadNotificationCount(token: string): Promise<number> {
  const response = await apiRequest<NotificationListResponse>('notifications', {
    token,
    query: { page: 1, limit: 1 },
  });
  return response.unreadCount;
}
