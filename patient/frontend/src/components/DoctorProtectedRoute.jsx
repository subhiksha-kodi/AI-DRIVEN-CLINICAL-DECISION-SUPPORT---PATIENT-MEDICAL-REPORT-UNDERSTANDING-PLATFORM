import { Navigate } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';

const DoctorProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useDoctorAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/doctor/login" replace />;
};

export default DoctorProtectedRoute;
