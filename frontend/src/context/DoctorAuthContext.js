import React, { createContext, useContext, useState, useEffect } from 'react';

const DoctorAuthContext = createContext(null);

export const DoctorAuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('doctorToken'));
  const [doctor, setDoctor] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('doctorToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('doctorToken');
    const storedDoctor = localStorage.getItem('doctorInfo');
    
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      if (storedDoctor) {
        try {
          setDoctor(JSON.parse(storedDoctor));
        } catch (e) {
          console.error('Error parsing doctor info:', e);
        }
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken, doctorInfo = null) => {
    localStorage.setItem('doctorToken', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    if (doctorInfo) {
      localStorage.setItem('doctorInfo', JSON.stringify(doctorInfo));
      setDoctor(doctorInfo);
    }
  };

  const logout = () => {
    localStorage.removeItem('doctorToken');
    localStorage.removeItem('doctorInfo');
    setToken(null);
    setDoctor(null);
    setIsAuthenticated(false);
  };

  const updateDoctor = (doctorInfo) => {
    localStorage.setItem('doctorInfo', JSON.stringify(doctorInfo));
    setDoctor(doctorInfo);
  };

  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <DoctorAuthContext.Provider value={{ 
      token, 
      doctor, 
      isAuthenticated, 
      login, 
      logout,
      updateDoctor 
    }}>
      {children}
    </DoctorAuthContext.Provider>
  );
};

export const useDoctorAuth = () => {
  const context = useContext(DoctorAuthContext);
  if (!context) {
    throw new Error('useDoctorAuth must be used within a DoctorAuthProvider');
  }
  return context;
};
