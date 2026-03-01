import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { DoctorAuthProvider } from './context/DoctorAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DoctorProtectedRoute from './components/DoctorProtectedRoute';
import Layout from './components/Layout';
import DoctorLayout from './components/DoctorLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ManageDoctorsPage from './pages/ManageDoctorsPage';
import ManagePatientsPage from './pages/ManagePatientsPage';
import AdminEhrPage from './pages/AdminEhrPage';

// Doctor pages
import DoctorLoginPage from './pages/doctor/DoctorLoginPage';
import DoctorRegisterPage from './pages/doctor/DoctorRegisterPage';
import DoctorDashboardPage from './pages/doctor/DoctorDashboardPage';
import DoctorProfilePage from './pages/doctor/DoctorProfilePage';
import DoctorEhrPage from './pages/doctor/DoctorEhrPage';
import LabReportTrendPage from './pages/doctor/LabReportTrendPage';

import LandingPage from './pages/LandingPage';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import DoctorPublicOnlyRoute from './components/DoctorPublicOnlyRoute';

function App() {
  return (
    <AuthProvider>
      <DoctorAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Landing Pages (public, redirect to dashboard if logged in) ── */}
            <Route
              path="/"
              element={
                <PublicOnlyRoute redirectTo="/dashboard">
                  <LandingPage theme="admin" />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/doctor-landing"
              element={
                <DoctorPublicOnlyRoute redirectTo="/doctor/dashboard">
                  <LandingPage theme="doctor" />
                </DoctorPublicOnlyRoute>
              }
            />

            {/* ── Admin Public ── */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute redirectTo="/dashboard">
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />

            {/* ── Admin Protected ── */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/doctors" element={<ManageDoctorsPage />} />
              <Route path="/patients" element={<ManagePatientsPage />} />
              <Route path="/ehr-analysis" element={<AdminEhrPage />} />
            </Route>

            {/* ── Doctor Public ── */}
            <Route
              path="/doctor/login"
              element={
                <DoctorPublicOnlyRoute redirectTo="/doctor/dashboard">
                  <DoctorLoginPage />
                </DoctorPublicOnlyRoute>
              }
            />
            <Route
              path="/doctor/register"
              element={
                <DoctorPublicOnlyRoute redirectTo="/doctor/dashboard">
                  <DoctorRegisterPage />
                </DoctorPublicOnlyRoute>
              }
            />

            {/* ── Doctor Protected ── */}
            <Route path="/doctor" element={<DoctorProtectedRoute><DoctorLayout /></DoctorProtectedRoute>}>
              <Route index element={<Navigate to="/doctor/dashboard" replace />} />
              <Route path="dashboard" element={<DoctorDashboardPage />} />
              <Route path="trend-analysis" element={<LabReportTrendPage />} />
              <Route path="ehr-analysis" element={<DoctorEhrPage />} />
              <Route path="profile" element={<DoctorProfilePage />} />
            </Route>

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Global Toaster for all pages */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </BrowserRouter>
      </DoctorAuthProvider>
    </AuthProvider>
  );
}

export default App;
