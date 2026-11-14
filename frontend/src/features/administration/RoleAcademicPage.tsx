import { useAuth } from '../../app/providers/useAuth';
import { AcademicsPage } from '../academics/AcademicsPage';
import { InstitutionalAcademicOverviewPage } from './InstitutionalAcademicOverviewPage';

export function RoleAcademicPage() {
  const { user } = useAuth();
  return ['dean', 'principal', 'admin', 'superadmin'].includes(user?.role || '') ? (
    <InstitutionalAcademicOverviewPage />
  ) : (
    <AcademicsPage />
  );
}
