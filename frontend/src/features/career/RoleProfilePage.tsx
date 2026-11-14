import { useAuth } from '../../app/providers/useAuth';
import { ComingSoonPage } from '../dashboard/ComingSoonPage';
import { AlumniProfilePage } from './AlumniProfilePage';

export function RoleProfilePage() {
  const { user } = useAuth();
  return user?.role === 'alumni' ? <AlumniProfilePage /> : <ComingSoonPage />;
}
