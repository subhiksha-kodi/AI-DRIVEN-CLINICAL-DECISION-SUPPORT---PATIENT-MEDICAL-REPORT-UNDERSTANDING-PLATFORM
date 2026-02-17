import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import { adminLogin } from '../services/api';
import { doctorLogin, doctorRegister } from '../services/doctorApi';
import { 
  Activity, 
  Mail, 
  Lock, 
  Shield, 
  CheckCircle, 
  User,
  Phone,
  Building,
  Stethoscope,
  UserCog,
  Clock
} from 'lucide-react';

const Login = () => {
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'doctor'
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    specialization: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: adminAuthLogin } = useAuth();
  const { login: doctorAuthLogin } = useDoctorAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const data = await adminLogin(formData.email, formData.password);
      adminAuthLogin(data.access_token);
      toast.success('Admin login successful!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const data = await doctorLogin(formData.email, formData.password);
      doctorAuthLogin(data.access_token, data.doctor);
      toast.success('Login successful!');
      navigate('/doctor/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorRegister = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      await doctorRegister({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        specialization: formData.specialization
      });
      toast.success('Registration submitted! Please wait for admin approval before logging in.');
      setIsRegister(false);
      setFormData({ ...formData, password: '', name: '', phone: '', specialization: '' });
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setIsRegister(false);
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: '',
      specialization: ''
    });
  };

  return (
    <div className="login-container">
      {/* Branding Section */}
      <div className="login-branding">
        <div className="login-logo">
          <Activity />
        </div>
        <h1>Clinical Intelligence Hub</h1>
        <p>Healthcare Management Portal</p>
        
        <div className="portal-features">
          <div className="feature-item">
            <CheckCircle size={20} />
            <span>AI-Powered Report Analysis</span>
          </div>
          <div className="feature-item">
            <CheckCircle size={20} />
            <span>Automated Lab Value Extraction</span>
          </div>
          <div className="feature-item">
            <CheckCircle size={20} />
            <span>Drug Interaction Alerts</span>
          </div>
          <div className="feature-item">
            <CheckCircle size={20} />
            <span>Clinical Decision Support</span>
          </div>
        </div>
      </div>

      {/* Login Card */}
      <div className="login-card">
        {/* Role Tabs */}
        <div className="role-tabs">
          <button 
            className={`role-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => switchTab('admin')}
          >
            <UserCog size={18} />
            Admin
          </button>
          <button 
            className={`role-tab ${activeTab === 'doctor' ? 'active' : ''}`}
            onClick={() => switchTab('doctor')}
          >
            <Stethoscope size={18} />
            Doctor
          </button>
        </div>

        <h2>
          {activeTab === 'admin' 
            ? 'Admin Sign In' 
            : isRegister 
              ? 'Doctor Registration' 
              : 'Doctor Sign In'}
        </h2>
        
        {/* Admin Login Form */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLogin}>
            <div className="demo-credentials">
              <span>Demo: admin@admin.com / admin123</span>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@admin.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="admin123"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In as Admin'}
            </button>
          </form>
        )}

        {/* Doctor Login/Register Form */}
        {activeTab === 'doctor' && !isRegister && (
          <form onSubmit={handleDoctorLogin}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="doctor@hospital.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In as Doctor'}
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setIsRegister(true)}
            >
              New Doctor? Register Here
            </button>
          </form>
        )}

        {/* Doctor Registration Form */}
        {activeTab === 'doctor' && isRegister && (
          <form onSubmit={handleDoctorRegister}>
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <div className="input-wrapper">
                <User />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Dr. John Smith"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <div className="input-wrapper">
                <Mail />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="doctor@hospital.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="input-wrapper">
                <Lock />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <div className="input-wrapper">
                <Phone />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="specialization">Specialization</label>
              <div className="input-wrapper">
                <Building />
                <input
                  type="text"
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="Cardiology, General Medicine, etc."
                />
              </div>
            </div>

            <div className="approval-notice">
              <Clock size={16} />
              <span>Your account will require admin approval before you can log in.</span>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setIsRegister(false)}
            >
              Already have an account? Sign In
            </button>
          </form>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="login-bottom-footer">
        <div className="compliance-badges">
          <span><Shield size={14} /> HIPAA Compliant</span>
          <span><CheckCircle size={14} /> SOC 2 Certified</span>
          <span><CheckCircle size={14} /> ISO 27001</span>
        </div>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Support</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
