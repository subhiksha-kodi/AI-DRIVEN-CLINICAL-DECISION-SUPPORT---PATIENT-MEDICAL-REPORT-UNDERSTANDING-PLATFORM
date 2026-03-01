import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const PatientAuthContext = createContext(null);

export const PatientAuthProvider = ({ children }) => {
  const [patient, setPatient] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('patient_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      const savedPatient = localStorage.getItem('patient_data');
      if (savedPatient) setPatient(JSON.parse(savedPatient));
    }
    setLoading(false);
  }, [token]);

  const login = useCallback((tokenValue, patientData) => {
    localStorage.setItem('patient_token', tokenValue);
    localStorage.setItem('patient_data', JSON.stringify(patientData));
    setToken(tokenValue);
    setPatient(patientData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('patient_token');
    localStorage.removeItem('patient_data');
    setToken(null);
    setPatient(null);
  }, []);

  const updatePatient = useCallback((patientData) => {
    localStorage.setItem('patient_data', JSON.stringify(patientData));
    setPatient(patientData);
  }, []);

  return (
    <PatientAuthContext.Provider value={{ patient, token, loading, login, logout, updatePatient, isAuthenticated: !!token }}>
      {children}
    </PatientAuthContext.Provider>
  );
};

export const usePatientAuth = () => {
  const ctx = useContext(PatientAuthContext);
  if (!ctx) throw new Error('usePatientAuth must be used within PatientAuthProvider');
  return ctx;
};
