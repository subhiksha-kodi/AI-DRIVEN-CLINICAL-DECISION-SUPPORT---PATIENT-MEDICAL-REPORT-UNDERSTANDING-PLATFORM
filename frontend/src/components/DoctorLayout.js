import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import { 
  LayoutDashboard, 
  Users, 
  FileSearch,
  LogOut,
  Stethoscope,
  Menu,
  X,
  User,
  ChevronDown
} from 'lucide-react';

const DoctorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { doctor, logout } = useDoctorAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/doctor/patients', icon: Users, label: 'My Patients' },
    { path: '/doctor/search', icon: FileSearch, label: 'Search Reports' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/doctor/login');
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside 
        className={`sidebar doctor-sidebar ${sidebarOpen ? 'open' : ''} ${isExpanded ? 'expanded' : ''}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <Stethoscope />
            </div>
            <span className="logo-text">Doctor Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut className="nav-icon" />
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button 
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X /> : <Menu />}
            </button>
          </div>

          <div className="header-right">
            <div className="user-menu">
              <button 
                className="user-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="user-avatar doctor-avatar">
                  <User />
                </div>
                <div className="user-info">
                  <span className="user-name">{doctor?.name || 'Doctor'}</span>
                  <span className="user-role">{doctor?.specialization || 'Physician'}</span>
                </div>
                <ChevronDown className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div 
                    className="dropdown-overlay"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="dropdown-menu">
                    <Link 
                      to="/doctor/profile" 
                      className="dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User size={16} />
                      My Profile
                    </Link>
                    <button className="dropdown-item" onClick={handleLogout}>
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DoctorLayout;
