import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, Lock, Mail, User, IdCard, Phone, Briefcase } from 'lucide-react';
import doctorApi from '../../api/doctorAxios';
import toast from 'react-hot-toast';

const DoctorRegisterPage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    medical_license_id: '',
    specialization: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!form.name || !form.email || !form.password || !form.medical_license_id) {
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
      const { data } = await doctorApi.post('/doctor/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        medical_license_id: form.medical_license_id,
        specialization: form.specialization || null,
        phone: form.phone || null,
      });
      
      toast.success(data.message || 'Registration successful! Please wait for admin approval.');
      navigate('/doctor/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
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
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 rounded-2xl shadow-2xl shadow-emerald-600/40 mb-3">
            <Stethoscope size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">ClinicalIQ</h1>
          <p className="text-emerald-300/70 text-sm mt-1">Doctor Registration</p>
        </div>

        {/* Register form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
          <h2 className="text-white text-lg font-semibold mb-1">Create Account</h2>
          <p className="text-slate-400 text-sm mb-5">Register as a medical professional</p>

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
                  placeholder="Dr. John Smith"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
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
                  placeholder="doctor@clinic.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Medical License ID */}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Medical License ID *</label>
              <div className="relative">
                <IdCard size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  name="medical_license_id"
                  value={form.medical_license_id}
                  onChange={handleChange}
                  placeholder="e.g., MCI-123456"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Specialization & Phone in a row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-1">Specialization</label>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    name="specialization"
                    value={form.specialization}
                    onChange={handleChange}
                    placeholder="Cardiology"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  />
                </div>
              </div>
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  />
                </div>
              </div>
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
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
                  Registering...
                </>
              ) : 'Register'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link to="/doctor/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-amber-300 text-xs text-center">
              Note: Your account will require admin approval before you can log in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorRegisterPage;
