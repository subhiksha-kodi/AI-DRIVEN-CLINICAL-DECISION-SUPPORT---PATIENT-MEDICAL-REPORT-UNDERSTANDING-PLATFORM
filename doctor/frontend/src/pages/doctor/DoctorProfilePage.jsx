import { useState, useEffect } from 'react';
import { User, Mail, IdCard, Briefcase, Phone, Save, Lock, Eye, EyeOff } from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import doctorApi from '../../api/doctorAxios';
import toast from 'react-hot-toast';

const DoctorProfilePage = () => {
  const { doctor, updateDoctor } = useDoctorAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    medical_license_id: '',
    specialization: '',
    phone: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (doctor) {
      setForm({
        name: doctor.name || '',
        email: doctor.email || '',
        medical_license_id: doctor.medical_license_id || '',
        specialization: doctor.specialization || '',
        phone: doctor.phone || '',
      });
    }
  }, [doctor]);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handlePasswordChange = (e) => setPasswordForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error('Name is required');
      return;
    }

    setLoading(true);
    try {
      const { data } = await doctorApi.put('/doctor/profile', {
        name: form.name,
        specialization: form.specialization,
        phone: form.phone,
      });
      updateDoctor(data.data);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!passwordForm.current_password || !passwordForm.new_password) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await doctorApi.put('/doctor/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">View and update your profile information</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold uppercase">
              {form.name?.charAt(0) || 'D'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{form.name || 'Doctor'}</h2>
            <p className="text-slate-500 text-sm">{form.specialization || 'Medical Professional'}</p>
            <p className="text-emerald-600 text-xs mt-1">License: {form.medical_license_id}</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="text-slate-600 text-sm font-medium block mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Dr. John Smith"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="text-slate-600 text-sm font-medium block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  disabled
                  className="input-field pl-10 bg-slate-50 cursor-not-allowed"
                />
              </div>
              <p className="text-slate-400 text-xs mt-1">Email cannot be changed</p>
            </div>

            {/* Medical License (read-only) */}
            <div>
              <label className="text-slate-600 text-sm font-medium block mb-1.5">Medical License ID</label>
              <div className="relative">
                <IdCard size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  name="medical_license_id"
                  value={form.medical_license_id}
                  disabled
                  className="input-field pl-10 bg-slate-50 cursor-not-allowed"
                />
              </div>
              <p className="text-slate-400 text-xs mt-1">License ID cannot be changed</p>
            </div>

            {/* Specialization */}
            <div>
              <label className="text-slate-600 text-sm font-medium block mb-1.5">Specialization</label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Cardiology"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-slate-600 text-sm font-medium block mb-1.5">Phone</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="+91-9876543210"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password card */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Lock size={20} className="text-slate-400" /> Change Password
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Password */}
            <div>
              <label className="text-slate-600 text-sm font-medium block mb-1.5">Current Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  name="current_password"
                  value={passwordForm.current_password}
                  onChange={handlePasswordChange}
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => !p)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="text-slate-600 text-sm font-medium block mb-1.5">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  name="new_password"
                  value={passwordForm.new_password}
                  onChange={handlePasswordChange}
                  className="input-field pl-10"
                  placeholder="Min. 6 characters"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-slate-600 text-sm font-medium block mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPasswords ? 'text' : 'password'}
                  name="confirm_password"
                  value={passwordForm.confirm_password}
                  onChange={handlePasswordChange}
                  className="input-field pl-10"
                  placeholder="Repeat password"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {passwordLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Lock size={16} /> Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorProfilePage;
