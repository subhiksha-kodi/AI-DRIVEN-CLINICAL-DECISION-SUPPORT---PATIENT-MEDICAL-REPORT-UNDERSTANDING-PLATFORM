import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="layout">
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Outlet />
      </main>
      
      {/* Mobile menu button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        style={{ display: window.innerWidth <= 768 ? 'flex' : 'none' }}
      >
        <Menu size={24} />
      </button>
    </div>
  );
};

export default Layout;
