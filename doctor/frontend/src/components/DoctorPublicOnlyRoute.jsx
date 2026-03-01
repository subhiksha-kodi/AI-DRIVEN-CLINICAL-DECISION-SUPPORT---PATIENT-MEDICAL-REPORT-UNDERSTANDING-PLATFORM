import { Navigate } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';

/**
 * DoctorPublicOnlyRoute — wraps pages that should only be shown to
 * unauthenticated doctor users (Doctor Landing page, Doctor Login page).
 * If the doctor is already logged in, redirect to /doctor/dashboard.
 */
const DoctorPublicOnlyRoute = ({ children, redirectTo = '/doctor/dashboard' }) => {
  const { isAuthenticated, loading } = useDoctorAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to={redirectTo} replace /> : children;
};

export default DoctorPublicOnlyRoute;
