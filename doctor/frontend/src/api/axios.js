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

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 globally - redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      window.location.href = '/login';
    }
    
    // Provide more detailed error messages
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Network error. Please check your connection.';
    
    return Promise.reject({
      ...error,
      userMessage: errorMessage
    });
  }
);

export default api;
