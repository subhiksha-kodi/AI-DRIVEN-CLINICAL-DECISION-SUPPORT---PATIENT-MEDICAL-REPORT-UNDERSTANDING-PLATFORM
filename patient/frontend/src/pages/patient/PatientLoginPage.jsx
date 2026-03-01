import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Eye, EyeOff, Lock, Mail, User, Hash } from 'lucide-react';
import { usePatientAuth } from '../../context/PatientAuthContext';
import patientApi from '../../api/patientAxios';
import toast from 'react-hot-toast';

const PatientLoginPage = () => {
  const [loginMode, setLoginMode] = useState('email'); // 'email' | 'register'
  const [form, setForm] = useState({
    email: '',
    password: '',
    registration_number: '',
    name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = usePatientAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loginMode === 'email') {
      if (!form.email || !form.password) {
        toast.error('Please enter email and password');
        return;
      }
    } else {
      if (!form.registration_number?.trim() || !form.name?.trim()) {
        toast.error('Please enter Register Number and Name');
        return;
      }
    }
    setLoading(true);
    try {
      const payload =
        loginMode === 'email'
          ? { email: form.email, password: form.password }
          : { registration_number: form.registration_number.trim(), name: form.name.trim() };
      const { data } = await patientApi.post('/patient/login', payload);
      login(data.token, data.patient);
      toast.success(`Welcome back, ${data.patient.name}!`);
      navigate('/patient/reports');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-600 rounded-2xl shadow-2xl shadow-sky-600/40 mb-4">
            <Heart size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">ClinicalIQ</h1>
          <p className="text-sky-300/70 text-sm mt-1">Patient Portal</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-semibold mb-1">Patient Login</h2>
          <p className="text-slate-400 text-sm mb-4">Sign in to access your medical reports</p>

          {/* Toggle: Email vs Register Number */}
          <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 mb-6">
            <button
              type="button"
              onClick={() => setLoginMode('email')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                loginMode === 'email' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                loginMode === 'register' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Register Number + Name
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMode === 'email' ? (
              <>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white transition"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Register Number</label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      name="registration_number"
                      value={form.registration_number}
                      onChange={handleChange}
                      placeholder="e.g. REG-2024-001"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                      autoComplete="username"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium block mb-1.5">Name (as password)</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your full name as given to hospital"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                      autoComplete="name"
                    />
                  </div>
                  <p className="text-slate-500 text-xs mt-1">Use the same name as on your lab report</p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-2 flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <p className="text-slate-400 text-sm">
              Don't have an account?{' '}
              <Link to="/patient/register" className="text-sky-400 hover:text-sky-300 font-medium">
                Register here
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © 2024 ClinicalIQ Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default PatientLoginPage;
