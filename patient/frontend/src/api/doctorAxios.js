import axios from 'axios';

const doctorApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
