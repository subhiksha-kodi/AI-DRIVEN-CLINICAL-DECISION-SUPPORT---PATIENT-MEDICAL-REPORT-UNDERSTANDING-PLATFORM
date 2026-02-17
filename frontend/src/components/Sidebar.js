import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  LogOut, 
  Menu,
  X
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
          <h1>Admin Panel</h1>
          <button className="toggle-btn" onClick={() => {
            if (window.innerWidth <= 768) {
              setMobileOpen(false);
            } else {
              setCollapsed(!collapsed);
            }
          }}>
            {mobileOpen || !collapsed ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <item.icon size={24} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          
          <div className="nav-item" onClick={handleLogout} style={{ marginTop: 'auto', cursor: 'pointer' }}>
            <LogOut size={24} />
            <span>Logout</span>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
