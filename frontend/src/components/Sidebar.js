import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  LogOut, 
  X,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/doctors', icon: UserCog, label: 'Manage Doctors' },
    { path: '/patients', icon: Users, label: 'Manage Patients' },
  ];

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Activity />
          </div>
          <div className="sidebar-header-text">
            <h1>Clinical Hub</h1>
            <p>Admin Portal</p>
          </div>
          {mobileOpen && (
            <button className="toggle-btn" onClick={() => setMobileOpen(false)}>
              <X size={18} />
            </button>
          )}
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-section-title">Main Menu</span>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={handleNavClick}
              >
                <item.icon size={22} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
          
          <div className="nav-spacer" />
          
          <div className="nav-section">
            <div className="nav-item logout" onClick={handleLogout}>
              <LogOut size={22} />
              <span>Logout</span>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
