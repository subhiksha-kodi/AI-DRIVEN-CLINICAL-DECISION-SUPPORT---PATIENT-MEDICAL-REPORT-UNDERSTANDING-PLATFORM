import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';

const Layout = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar (fixed, hover to expand) */}
      <Sidebar onExpandedChange={setIsSidebarExpanded} />

      {/* Main content shifts with sidebar width via CSS (.main-content) */}
      <main
        className="main-content flex-1"
        style={{ marginLeft: isSidebarExpanded ? '260px' : '64px' }}
      >
        <div className="min-h-screen p-6">
          <Outlet />
        </div>
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  );
};

export default Layout;
