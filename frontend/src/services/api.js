import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api/v1';

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
};

// ─── Complaint API calls ──────────────────────────────────────────────
export const complaintAPI = {
  create: (formData) => api.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  analyze: (title, description) => api.post('/complaints/analyze', { title, description }),
  getAll: () => api.get('/complaints'),
  getOne: (id) => api.get(`/complaints/${id}`),

  // Upvote / un-vote toggle
  vote: (id) => api.post(`/complaints/${id}/vote`),

  // Nearby complaints for pre-submission duplicate check
  getNearby: (lat, lng, radiusKm = 1, category = '') =>
    api.get('/complaints/nearby', { params: { lat, lng, radius: radiusKm, category } }),

  // Heatmap data — all complaints with lat/lng and priority weight
  getHeatmapData: () => api.get('/complaints/heatmap'),
};

// ─── Dashboard API calls (Mayor/Authority) ──────────────────────────
export const dashboardAPI = {
  getMetrics: (dateRange = 30) => api.get('/dashboard/metrics', { params: { dateRange } }),
  getSLAMetrics: (department, dateRange = 30) =>
    api.get('/dashboard/sla-metrics', { params: { department, dateRange } }),
  getDepartmentPerformance: (dateRange = 30) =>
    api.get('/dashboard/department-performance', { params: { dateRange } }),
  getCaseProgress: (dateRange = 30) =>
    api.get('/dashboard/case-progress', { params: { dateRange } }),
  getHeatmapAnalysis: (dateRange = 30) =>
    api.get('/dashboard/heatmap-analysis', { params: { dateRange } }),
  getIssuesTrend: (days = 30) =>
    api.get('/dashboard/issues-trend', { params: { days } }),
  getTopIssues: (limit = 10, dateRange = 30) =>
    api.get('/dashboard/top-issues', { params: { limit, dateRange } }),
};

// ─── Volunteer API calls ────────────────────────────────────────────
export const volunteerAPI = {
  register: (data) => api.post('/volunteers/register', data),
  getProfile: () => api.get('/volunteers/profile'),
  updateProfile: (data) => api.put('/volunteers/profile', data),
  registerForAnnouncement: (announcementId) =>
    api.post(`/volunteers/announcements/${announcementId}/register`),
  unregisterFromAnnouncement: (announcementId) =>
    api.delete(`/volunteers/announcements/${announcementId}/register`),
  getAll: (status, skill, district, limit, page) =>
    api.get('/volunteers', { params: { status, skill, district, limit, page } }),
  getPendingApplications: (limit = 50, page = 1) =>
    api.get('/volunteers/pending/applications', { params: { limit, page } }),
  verify: (volunteerId, status) =>
    api.put(`/volunteers/${volunteerId}/verify`, { status }),
  rate: (volunteerId, rating, hoursContributed) =>
    api.put(`/volunteers/${volunteerId}/rate`, { rating, hoursContributed }),
};

// ─── Announcement API calls ─────────────────────────────────────────
export const announcementAPI = {
  create: (data) => api.post('/announcements', data),
  getAll: (category, status, district, search, limit, page) =>
    api.get('/announcements', { params: { category, status, district, search, limit, page } }),
  getOne: (id) => api.get(`/announcements/${id}`),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
  publish: (id) => api.put(`/announcements/${id}/publish`),
  getMyAnnouncements: (status, limit, page) =>
    api.get('/announcements/my-announcements', { params: { status, limit, page } }),
  addUpdate: (id, message) => api.post(`/announcements/${id}/updates`, { message }),
  pin: (id) => api.put(`/announcements/${id}/pin`),
};

// ─── Case Progress API calls ────────────────────────────────────────
export const caseAPI = {
  register: (complaintId, caseType, severity) =>
    api.post('/cases', { complaintId, caseType, severity }),
  getOne: (id) => api.get(`/cases/${id}`),
  getAll: (status, severity, assignedOfficer, limit, page) =>
    api.get('/cases', { params: { status, severity, assignedOfficer, limit, page } }),
  updateStatus: (id, investigationStatus, message) =>
    api.put(`/cases/${id}/status`, { investigationStatus, message }),
  addEvidence: (id, description, type, url) =>
    api.post(`/cases/${id}/evidence`, { description, type, url }),
  addWitness: (id, name, contact, statement) =>
    api.post(`/cases/${id}/witnesses`, { name, contact, statement }),
  recordSuspect: (id, name, description, status, arrestWarrant, arrestDate) =>
    api.post(`/cases/${id}/suspects`, { name, description, status, arrestWarrant, arrestDate }),
  assignCase: (id, officerId) =>
    api.put(`/cases/${id}/assign`, { officerId }),
  updateCourtInfo: (id, caseNumber, courtName, filedDate, nextHearing, status) =>
    api.put(`/cases/${id}/court`, { caseNumber, courtName, filedDate, nextHearing, status }),
  getMyAssignedCases: (status, limit, page) =>
    api.get('/cases/my-cases', { params: { status, limit, page } }),
};

export default api;
