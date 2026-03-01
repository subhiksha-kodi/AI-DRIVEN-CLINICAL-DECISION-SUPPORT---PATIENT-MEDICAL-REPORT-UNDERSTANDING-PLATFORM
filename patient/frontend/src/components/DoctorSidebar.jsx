import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FileSearch,
  User,
  LogOut,
  Stethoscope,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/doctor/get-started', icon: Activity, label: 'Get Started' },
  { to: '/doctor/dashboard', icon: FileSearch, label: 'Analyze Reports' },
  { to: '/doctor/ehr-analysis', icon: Activity, label: 'EHR Analysis' },
  { to: '/doctor/profile', icon: User, label: 'Profile' },
];

const DoctorSidebar = ({ onExpandedChange }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, doctor } = useDoctorAuth();
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/doctor/login');
  };

  return (
    <aside
      className={`doctor-sidebar ${isHovered ? 'expanded' : ''}`}
      onMouseEnter={() => {
        setIsHovered(true);
        onExpandedChange?.(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onExpandedChange?.(false);
      }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50 min-h-[70px]">
        <div className="flex-shrink-0 w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
          <Stethoscope size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="sidebar-label flex flex-col min-w-0">
          <span className="text-white font-bold text-sm leading-tight">ClinicalIQ</span>
          <span className="text-slate-400 text-xs">Doctor Portal</span>
        </div>
      </div>

      {/* Doctor info */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-semibold uppercase">
              {doctor?.name?.charAt(0) || 'D'}
            </span>
          </div>
          <div className="sidebar-label min-w-0">
            <p className="text-white text-xs font-medium truncate">{doctor?.name || 'Doctor'}</p>
            <p className="text-slate-400 text-xs truncate">{doctor?.specialization || 'Medical Professional'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <Icon size={19} className="flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              <span className="sidebar-label font-medium text-sm">{label}</span>
              {isActive && (
                <ChevronRight size={14} className="sidebar-label ml-auto opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 mt-auto border-t border-slate-700/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut size={19} className="flex-shrink-0" />
          <span className="sidebar-label font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default DoctorSidebar;
