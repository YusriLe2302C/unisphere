import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/providers/useAuth';
import { LoadingScreen } from '../feedback/LoadingScreen';
import type { UserRole } from '../../types/auth';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  const location = useLocation();
  if (isInitializing) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && user && !roles.includes(user.role) && user.role !== 'superadmin') {
    return <Navigate to="/app" replace />;
  }
  return <Outlet />;
}
