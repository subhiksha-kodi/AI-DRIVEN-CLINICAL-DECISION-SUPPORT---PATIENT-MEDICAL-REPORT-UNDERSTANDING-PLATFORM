import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PublicOnlyRoute — wraps pages that should only be shown to
 * unauthenticated users (Landing page, Login page).
 * If the user is already logged in, redirect to /dashboard.
 */
const PublicOnlyRoute = ({ children, redirectTo = '/dashboard' }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to={redirectTo} replace /> : children;
};

export default PublicOnlyRoute;
