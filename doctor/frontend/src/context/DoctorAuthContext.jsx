import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const DoctorAuthContext = createContext(null);

export const DoctorAuthProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('doctor_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      const savedDoctor = localStorage.getItem('doctor_data');
      if (savedDoctor) setDoctor(JSON.parse(savedDoctor));
    }
    setLoading(false);
  }, [token]);

  const login = useCallback((tokenValue, doctorData) => {
    localStorage.setItem('doctor_token', tokenValue);
    localStorage.setItem('doctor_data', JSON.stringify(doctorData));
    setToken(tokenValue);
    setDoctor(doctorData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('doctor_token');
    localStorage.removeItem('doctor_data');
    setToken(null);
    setDoctor(null);
  }, []);

  const updateDoctor = useCallback((doctorData) => {
    localStorage.setItem('doctor_data', JSON.stringify(doctorData));
    setDoctor(doctorData);
  }, []);

  return (
    <DoctorAuthContext.Provider value={{ doctor, token, loading, login, logout, updateDoctor, isAuthenticated: !!token }}>
      {children}
    </DoctorAuthContext.Provider>
  );
};

export const useDoctorAuth = () => {
  const ctx = useContext(DoctorAuthContext);
  if (!ctx) throw new Error('useDoctorAuth must be used within DoctorAuthProvider');
  return ctx;
};
