import { useAuth } from '../../app/providers/useAuth';
import { DashboardPage } from '../dashboard/DashboardPage';
import { FacultyDashboardPage } from './FacultyDashboardPage';
import { AlumniDashboardPage } from '../career/AlumniDashboardPage';
import { AdministrationDashboardPage } from '../administration/AdministrationDashboardPage';

export function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === 'faculty') return <FacultyDashboardPage />;
  if (user?.role === 'alumni') return <AlumniDashboardPage />;
  if (['dean', 'principal', 'admin', 'superadmin'].includes(user?.role || ''))
    return <AdministrationDashboardPage />;
  return <DashboardPage />;
}
