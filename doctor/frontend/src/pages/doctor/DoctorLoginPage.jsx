import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import doctorApi from '../../api/doctorAxios';
import toast from 'react-hot-toast';

const DoctorLoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useDoctorAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const { data } = await doctorApi.post('/doctor/login', form);
      login(data.token, data.doctor);
      toast.success(`Welcome back, Dr. ${data.doctor.name}!`);
      navigate('/doctor/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-2xl shadow-emerald-600/40 mb-4">
            <Stethoscope size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">ClinicalIQ</h1>
          <p className="text-emerald-300/70 text-sm mt-1">Doctor Portal</p>
        </div>

        {/* Login form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-white text-xl font-semibold mb-1">Doctor Login</h2>
          <p className="text-slate-400 text-sm mb-6">Sign in to access your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-2 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <p className="text-slate-400 text-sm">
              Don't have an account?{' '}
              <Link to="/doctor/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
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

export default DoctorLoginPage;
