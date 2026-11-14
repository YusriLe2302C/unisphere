import { useAuth } from '../../app/providers/useAuth';
import { PlacementsDashboardPage } from '../placements/PlacementsDashboardPage';
import { InstitutionalPlacementsPage } from './InstitutionalPlacementsPage';

export function RolePlacementsPage() {
  const { user } = useAuth();
  return ['admin', 'superadmin', 'dean', 'principal'].includes(user?.role || '') ? (
    <InstitutionalPlacementsPage />
  ) : (
    <PlacementsDashboardPage />
  );
}
