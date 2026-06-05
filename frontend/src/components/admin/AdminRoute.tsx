import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
