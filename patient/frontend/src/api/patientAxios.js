import axios from 'axios';

const patientApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach patient JWT token to every request
patientApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('patient_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally - redirect to patient login
patientApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('patient_token');
      localStorage.removeItem('patient_data');
      window.location.href = '/patient/login';
    }
    return Promise.reject(error);
  }
);

export default patientApi;
