import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Eye, EyeOff, Lock, Mail, User, Phone, Calendar } from 'lucide-react';
import { usePatientAuth } from '../../context/PatientAuthContext';
import patientApi from '../../api/patientAxios';
import toast from 'react-hot-toast';

const PatientRegisterPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    date_of_birth: '',
    gender: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = usePatientAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { data } = await patientApi.post('/patient/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
      });
      
      // Auto-login after registration
      login(data.token, data.patient);
      toast.success('Registration successful! Welcome to ClinicalIQ.');
      navigate('/patient/reports');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-600 rounded-2xl shadow-2xl shadow-sky-600/40 mb-3">
            <Heart size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">ClinicalIQ</h1>
          <p className="text-sky-300/70 text-sm mt-1">Patient Registration</p>
        </div>

        {/* Register form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <h2 className="text-white text-lg font-semibold mb-1">Create Account</h2>
          <p className="text-slate-400 text-sm mb-5">Register to manage your medical reports</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Full Name *</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Email *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="patient@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Phone & DOB in a row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1">Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91-XXXXX"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1">Date of Birth</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="date"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleChange}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition appearance-none"
              >
                <option value="" className="bg-slate-800">Select Gender</option>
                <option value="male" className="bg-slate-800">Male</option>
                <option value="female" className="bg-slate-800">Female</option>
                <option value="other" className="bg-slate-800">Other</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Password *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
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

            {/* Confirm Password */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Confirm Password *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirm_password"
                  value={form.confirm_password}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-2 flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </>
              ) : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link to="/patient/login" className="text-sky-400 hover:text-sky-300 font-medium">
                Sign in
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

export default PatientRegisterPage;
