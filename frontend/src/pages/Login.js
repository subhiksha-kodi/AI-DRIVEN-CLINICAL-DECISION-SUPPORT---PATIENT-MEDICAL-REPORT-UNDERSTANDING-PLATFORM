import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { adminLogin } from '../services/api';
import { Activity, Mail, Lock, Shield, CheckCircle, Key } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const data = await adminLogin(email, password);
      login(data.access_token);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Branding Section */}
      <div className="login-branding">
        <div className="login-logo">
          <Activity />
        </div>
        <h1>Clinical Intelligence Hub</h1>
        <p>Healthcare Administration Portal</p>
      </div>

      {/* Login Card */}
      <div className="login-card">
        <h2>Sign In</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="form-row">
            <label className="checkbox-wrapper">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <a href="#" className="forgot-link">Forgot password?</a>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button type="button" className="btn btn-outline">
          <Key size={18} />
          Sign in with SSO
        </button>

        <div className="login-footer">
          New to Clinical Intelligence Hub? <a href="#">Request Access</a>
        </div>
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
