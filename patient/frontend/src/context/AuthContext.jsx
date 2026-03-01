import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      const savedAdmin = localStorage.getItem('admin');
      if (savedAdmin) setAdmin(JSON.parse(savedAdmin));
    }
    setLoading(false);
  }, [token]);

  const login = useCallback((tokenValue, adminData) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('admin', JSON.stringify(adminData));
    setToken(tokenValue);
    setAdmin(adminData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    setToken(null);
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
