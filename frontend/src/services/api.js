import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request interceptor: attach JWT token ───────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle auth errors globally ───────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API calls ──────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  verify: (formData) => api.put('/auth/verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (token, data) => api.put(`/auth/reset-password/${token}`, data),
};

// ─── Complaint API calls ──────────────────────────────────────────────
export const complaintAPI = {
  create: (formData) => api.post('/complaints', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  analyze: (title, description) => api.post('/complaints/analyze', { title, description }),
  getAll: () => api.get('/complaints'),
  getOne: (id) => api.get(`/complaints/${id}`),
  getHeatmapData: (days = 30) => api.get(`/complaints/heatmap?days=${days}`),
  getNearby: (lat, lng, radius = 1.0) => api.get(`/complaints/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
  vote: (id) => api.post(`/complaints/${id}/vote`),
};

export default api;
