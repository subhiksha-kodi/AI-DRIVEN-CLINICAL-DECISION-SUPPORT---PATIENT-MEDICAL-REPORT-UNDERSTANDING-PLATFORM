import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const adminLogin = async (email, password) => {
  const response = await api.post('/doctor/admin/login', { email, password });
  return response.data;
};

// Stats API
export const getStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

// Upload Report API
export const uploadReport = async (formData) => {
  const response = await api.post('/admin/upload-report', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Reports APIs
export const getReports = async (page = 1, limit = 10) => {
  const response = await api.get(`/admin/reports?page=${page}&limit=${limit}`);
  return response.data;
};

export const getReportsCount = async () => {
  const response = await api.get('/admin/reports/count');
  return response.data;
};

export const searchReports = async (query) => {
  const response = await api.get(`/admin/search?query=${encodeURIComponent(query)}`);
  return response.data;
};

// Doctors APIs
export const getDoctors = async (page = 1, limit = 10, search = '') => {
  let url = `/admin/doctors?page=${page}&limit=${limit}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getDoctorsCount = async (search = '') => {
  let url = '/admin/doctors/count';
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const searchDoctors = async (query) => {
  const response = await api.get(`/admin/doctors/search?query=${encodeURIComponent(query)}`);
  return response.data;
};

export const getApprovedDoctors = async () => {
  const response = await api.get('/admin/doctors/approved');
  return response.data;
};

export const approveDoctor = async (doctorId) => {
  const response = await api.patch(`/admin/doctors/${doctorId}/approve`);
  return response.data;
};

export const rejectDoctor = async (doctorId) => {
  const response = await api.patch(`/admin/doctors/${doctorId}/reject`);
  return response.data;
};

// Patients APIs
export const getPatients = async (page = 1, limit = 10, search = '') => {
  let url = `/admin/patients?page=${page}&limit=${limit}`;
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await api.get(url);
  return response.data;
};

export const getPatientsCount = async (search = '') => {
  let url = '/admin/patients/count';
  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }
  const response = await api.get(url);
  return response.data;
};

export default api;
