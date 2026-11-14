import { useAuth } from '../../app/providers/useAuth';
import { CareerConnectPage } from './CareerConnectPage';
import { AlumniDashboardPage } from './AlumniDashboardPage';

export function RoleCareerConnectPage() {
  const { user } = useAuth();
  return user?.role === 'alumni' ? <AlumniDashboardPage /> : <CareerConnectPage />;
}
