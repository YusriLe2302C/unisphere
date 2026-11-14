import { useAuth } from '../../app/providers/useAuth';
import { EventsPage } from '../events/EventsPage';
import { AdministrationEventsPage } from './AdministrationEventsPage';

export function RoleEventsPage() {
  const { user } = useAuth();
  return ['admin', 'superadmin', 'dean', 'principal'].includes(user?.role || '') ? (
    <AdministrationEventsPage />
  ) : (
    <EventsPage />
  );
}
