import { useEffect, useState } from 'react';
import { getUnreadNotificationCount } from '../services/notifications/notification-api';

export function useUnreadNotifications(token: string | undefined): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    if (!token) {
      setCount(null);
      return () => {
        active = false;
      };
    }

    const refresh = () =>
      getUnreadNotificationCount(token)
        .then((nextCount) => {
          if (active) setCount(nextCount);
        })
        .catch(() => {
          if (active) setCount(null);
        });
    void refresh();
    window.addEventListener('unisphere:notifications-updated', refresh);

    return () => {
      active = false;
      window.removeEventListener('unisphere:notifications-updated', refresh);
    };
  }, [token]);

  return count;
}
