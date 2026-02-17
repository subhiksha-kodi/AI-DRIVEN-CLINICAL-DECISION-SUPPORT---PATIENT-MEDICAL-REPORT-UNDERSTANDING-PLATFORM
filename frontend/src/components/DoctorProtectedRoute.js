import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';

const DoctorProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useDoctorAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default DoctorProtectedRoute;
