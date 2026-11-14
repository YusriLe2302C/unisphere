import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  Pagination,
  Skeleton,
} from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyNotificationsUpdated,
  type AppNotification,
  type NotificationType,
} from '../../services/notifications/notification-api';
import { useToast } from '../../app/providers/useToast';
import './shared.css';

const types: NotificationType[] = [
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
  'collaboration_status',
];
const routeByType: Partial<Record<NotificationType, (id?: string) => string>> = {
  announcement: () => '/app/announcements',
  event_registration: () => '/app/events/mine',
  schedule_change: () => '/app/events',
  calendar_change: () => '/app/calendar',
  application_status: () => '/app/placements/applications',
  opportunity: () => '/app/opportunities',
  research_publication: () => '/app/research/publications',
  collaboration_invite: () => '/app/research/collaborations',
  collaboration_request: () => '/app/research/collaborations/requests',
  collaboration_status: () => '/app/research/collaborations',
};

export function NotificationsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [type, setType] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      const data = await getNotifications(session.token, { type, unreadOnly, page, limit: 20 });
      setItems(data.notifications);
      setUnread(data.unreadCount);
      setPages(Math.max(1, data.pagination.pages));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Notifications could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.token, type, unreadOnly, page]);
  useEffect(() => {
    void load();
  }, [load]);
  async function open(item: AppNotification) {
    setSelected(item);
    if (!item.isRead && session?.token) {
      try {
        await markNotificationRead(session.token, item._id);
        notifyNotificationsUpdated();
        await load();
      } catch (e) {
        notify(e instanceof ApiError ? e.message : 'Could not mark notification as read.', 'error');
      }
    }
  }
  async function markAll() {
    if (!session?.token) return;
    try {
      await markAllNotificationsRead(session.token);
      notifyNotificationsUpdated();
      await load();
      notify('All notifications marked as read.', 'success');
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Could not update notifications.', 'error');
    }
  }
  function follow(item: AppNotification) {
    const target = routeByType[item.type];
    if (target) navigate(target(item.entityId));
  }
  return (
    <div className="shared-page">
      <header className="shared-heading">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Notifications</h1>
          <p>Your recent account and campus updates.</p>
        </div>
        <Button
          variant="outline"
          leadingIcon={<CheckCheck size={16} />}
          disabled={!unread || loading}
          onClick={() => void markAll()}
        >
          Mark all as read
        </Button>
      </header>
      <Card className="shared-filter-row">
        <label>
          Type{' '}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All notifications</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="shared-checkbox">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              setPage(1);
            }}
          />
          Unread only
        </label>
        <span className="shared-muted">{unread} unread</span>
      </Card>
      {error ? (
        <ErrorState description={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="shared-skeleton-list" aria-label="Loading notifications">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={78} />
          ))}
        </div>
      ) : !items.length ? (
        <EmptyState
          icon={<Bell />}
          title="You’re all caught up"
          description="Notifications that arrive for your account will appear here."
        />
      ) : (
        <div className="shared-notification-list">
          {items.map((item) => (
            <Card key={item._id} className={`shared-notification${item.isRead ? '' : 'is-unread'}`}>
              <button
                type="button"
                className="shared-notification-main"
                onClick={() => void open(item)}
              >
                <span className="shared-unread-dot" aria-hidden="true" />
                <span className="shared-notification-copy">
                  <span className="shared-notification-meta">
                    {item.sender?.name || item.type.replaceAll('_', ' ')}{' '}
                    <Badge size="sm" variant={item.isRead ? 'neutral' : 'brand'}>
                      {item.type.replaceAll('_', ' ')}
                    </Badge>
                  </span>
                  <strong>{item.message}</strong>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </span>
              </button>
              {routeByType[item.type] && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Open related page"
                  onClick={() => follow(item)}
                >
                  <ExternalLink size={16} />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
      {!loading && !error && pages > 1 && (
        <Pagination page={page} totalPages={pages} onPageChange={setPage} />
      )}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.sender?.name || 'Notification'}
        description={selected?.type.replaceAll('_', ' ')}
      >
        {selected && (
          <div className="shared-notification-details">
            <p>{selected.message}</p>
            <small>{new Date(selected.createdAt).toLocaleString()}</small>
            {routeByType[selected.type] && (
              <div>
                <Button className="shared-detail-action" onClick={() => follow(selected)}>
                  View related page
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
