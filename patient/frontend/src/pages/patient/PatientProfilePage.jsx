import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, MapPin, Lock, Save } from 'lucide-react';
import patientApi from '../../api/patientAxios';
import { usePatientAuth } from '../../context/PatientAuthContext';
import toast from 'react-hot-toast';

const PatientProfilePage = () => {
  const { patient, updatePatient } = usePatientAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data } = await patientApi.get('/patient/profile');
      const p = data.data;
      setForm({
        name: p.name || '',
        email: p.email || '',
        phone: p.phone || '',
        date_of_birth: p.date_of_birth || '',
        gender: p.gender || '',
        address: p.address || '',
      });
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordChange = (e) => {
    setPasswordForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const { data } = await patientApi.put('/patient/profile', {
        name: form.name,
        phone: form.phone || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        address: form.address || null,
      });
      
      updatePatient(data.data);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
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

    setChangingPassword(true);
    try {
      await patientApi.put('/patient/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Profile Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account information</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'security'
                ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Security
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'profile' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    readOnly
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-sm cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
                      placeholder="+91-XXXXX"
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Birth</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      name="date_of_birth"
                      value={form.date_of_birth}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm appearance-none bg-white"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-3 text-slate-400" />
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm resize-none"
                    placeholder="Enter your address"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-md">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">Change Password</h3>
                <p className="text-slate-500 text-sm">Update your password to keep your account secure</p>
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    name="current_password"
                    value={passwordForm.current_password}
                    onChange={handlePasswordChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
                    placeholder="Enter current password"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    name="new_password"
                    value={passwordForm.new_password}
                    onChange={handlePasswordChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
                    placeholder="Enter new password (min. 6 characters)"
                  />
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    name="confirm_password"
                    value={passwordForm.confirm_password}
                    onChange={handlePasswordChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition text-sm"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
                >
                  {changingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientProfilePage;
