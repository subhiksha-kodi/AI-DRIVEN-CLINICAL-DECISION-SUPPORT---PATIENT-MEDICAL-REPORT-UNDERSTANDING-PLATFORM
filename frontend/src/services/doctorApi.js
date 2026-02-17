import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const doctorApi = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
doctorApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('doctorToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
doctorApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('doctorToken');
      localStorage.removeItem('doctorInfo');
      window.location.href = '/doctor/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const doctorLogin = async (email, password) => {
  const response = await doctorApi.post('/doctor/login', { email, password });
  return response.data;
};

export const doctorRegister = async (data) => {
  const response = await doctorApi.post('/doctor/register', data);
  return response.data;
};

// Doctor Portal APIs
export const getDoctorStats = async () => {
  const response = await doctorApi.get('/doctor/portal/stats');
  return response.data;
};

export const getDoctorProfile = async () => {
  const response = await doctorApi.get('/doctor/portal/me');
  return response.data;
};

export const getDoctorPatients = async (page = 1, limit = 10) => {
  const response = await doctorApi.get(`/doctor/portal/patients?page=${page}&limit=${limit}`);
  return response.data;
};

export const getPatientReport = async (registerNumber) => {
  const response = await doctorApi.get(`/doctor/portal/report/${registerNumber}`);
  return response.data;
};

export const extractReportData = async (reportId) => {
  const response = await doctorApi.post(`/doctor/portal/extract/${reportId}`);
  return response.data;
};

export const markReportReviewed = async (reportId, notes = '') => {
  const response = await doctorApi.patch(`/doctor/portal/review/${reportId}`, { notes });
  return response.data;
};

export const getExtractedData = async (reportId) => {
  const response = await doctorApi.get(`/doctor/portal/extracted/${reportId}`);
  return response.data;
};

export default doctorApi;
