import axios from 'axios';

// Use relative /api path for Docker (nginx proxies to backend)
// Use http://localhost:5000/api for local development
const getBaseURL = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production (Docker), use relative path - nginx proxies to backend
  if (import.meta.env.PROD) {
    return '/api';
  }
  // Local development
  return 'http://localhost:5000/api';
};

const doctorApi = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
});

// Attach doctor JWT token to every request
doctorApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('doctor_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally - redirect to doctor login
doctorApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('doctor_token');
      localStorage.removeItem('doctor_data');
      window.location.href = '/doctor/login';
    }
    return Promise.reject(error);
  }
);

export default doctorApi;
