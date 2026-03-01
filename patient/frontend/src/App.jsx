import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { DoctorAuthProvider } from './context/DoctorAuthContext';
import { PatientAuthProvider } from './context/PatientAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DoctorProtectedRoute from './components/DoctorProtectedRoute';
import PatientProtectedRoute from './components/PatientProtectedRoute';
import Layout from './components/Layout';
import DoctorLayout from './components/DoctorLayout';
import PatientLayout from './components/PatientLayout';
import LoginPage from './pages/LoginPage';
import MindForgeLandingPage from './pages/MindForgeLandingPage';
import DashboardPage from './pages/DashboardPage';
import ManageDoctorsPage from './pages/ManageDoctorsPage';
import ManagePatientsPage from './pages/ManagePatientsPage';
import AdminEhrPage from './pages/AdminEhrPage';
import AppointmentsPage from './pages/AppointmentsPage';
import AdminGetStartedPage from './pages/AdminGetStartedPage';

// Doctor pages
import DoctorLoginPage from './pages/doctor/DoctorLoginPage';
import DoctorRegisterPage from './pages/doctor/DoctorRegisterPage';
import DoctorDashboardPage from './pages/doctor/DoctorDashboardPage';
import DoctorProfilePage from './pages/doctor/DoctorProfilePage';
import DoctorEhrPage from './pages/doctor/DoctorEhrPage';
import DoctorGetStartedPage from './pages/doctor/DoctorGetStartedPage';

// Patient pages
import PatientLoginPage from './pages/patient/PatientLoginPage';
import PatientRegisterPage from './pages/patient/PatientRegisterPage';
import PatientReportsPage from './pages/patient/PatientReportsPage';
import PatientLabReportsPage from './pages/patient/PatientLabReportsPage';
import PatientProfilePage from './pages/patient/PatientProfilePage';
import PatientAssistantPage from './pages/patient/PatientAssistantPage';
import PatientGetStartedPage from './pages/patient/PatientGetStartedPage';
import PatientDietChartPage from './pages/patient/PatientDietChartPage';

function App() {
  return (
    <AuthProvider>
      <DoctorAuthProvider>
        <PatientAuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Landing */}
              <Route path="/" element={<MindForgeLandingPage />} />

              {/* Admin Public */}
              <Route path="/login" element={<LoginPage />} />

              {/* Admin Protected */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/doctors" element={<ManageDoctorsPage />} />
                <Route path="/patients" element={<ManagePatientsPage />} />
                <Route path="/appointments" element={<AppointmentsPage />} />
                <Route path="/ehr-analysis" element={<AdminEhrPage />} />
              </Route>

              {/* Doctor Public */}
              <Route path="/doctor/login" element={<DoctorLoginPage />} />
              <Route path="/doctor/register" element={<DoctorRegisterPage />} />

              {/* Doctor Protected */}
              <Route path="/doctor" element={<DoctorProtectedRoute><DoctorLayout /></DoctorProtectedRoute>}>
                <Route index element={<Navigate to="/doctor/get-started" replace />} />
                <Route path="get-started" element={<DoctorGetStartedPage />} />
                <Route path="dashboard" element={<DoctorDashboardPage />} />
                <Route path="ehr-analysis" element={<DoctorEhrPage />} />
                <Route path="profile" element={<DoctorProfilePage />} />
              </Route>

              {/* Patient Public */}
              <Route path="/patient/login" element={<PatientLoginPage />} />
              <Route path="/patient/register" element={<PatientRegisterPage />} />

              {/* Patient Protected */}
              <Route path="/patient" element={<PatientProtectedRoute><PatientLayout /></PatientProtectedRoute>}>
                <Route index element={<Navigate to="/patient/reports" replace />} />
                <Route path="get-started" element={<PatientGetStartedPage />} />
                <Route path="reports" element={<PatientReportsPage />} />
                <Route path="lab-reports" element={<PatientLabReportsPage />} />
                <Route path="assistant" element={<PatientAssistantPage />} />
                <Route path="diet-chart" element={<PatientDietChartPage />} />
                <Route path="profile" element={<PatientProfilePage />} />
              </Route>

              {/* Fallback */}
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
        </PatientAuthProvider>
      </DoctorAuthProvider>
    </AuthProvider>
  );
}

export default App;
