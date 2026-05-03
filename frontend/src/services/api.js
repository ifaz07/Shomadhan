import axios from "axios";
import { getApiBaseUrl } from "../utils/apiBase";

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request interceptor: attach JWT token ───────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor: handle auth errors globally ───────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/signup")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth API calls ──────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  verify: (formData) =>
    api.put("/auth/verify", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (token, data) =>
    api.put(`/auth/reset-password/${token}`, data),
  updatePhone: (data) => api.put("/auth/update-phone", data),
  updateAvatar: (formData) =>
    api.put("/auth/update-avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteAvatar: () => api.delete("/auth/avatar"),
  updateAddress: (data) => api.put("/auth/update-address", data),
};

// ─── Complaint API calls ──────────────────────────────────────────────
export const complaintAPI = {
  create: (formData) =>
    api.post("/complaints", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  analyze: (title, description) =>
    api.post("/complaints/analyze", { title, description }),
  getAll: (params = {}) => api.get("/complaints", { params }),
  getStats: (params = {}) => api.get("/complaints/stats", { params }),
  getOne: (id) => api.get(`/complaints/${id}`),

  // Upvote / un-vote toggle
  vote: (id) => api.post(`/complaints/${id}/vote`),

  // Nearby complaints for pre-submission duplicate check
  getNearby: (lat, lng, radiusKm = 1, category = "", extraParams = {}) =>
    api.get("/complaints/nearby", {
      params: { lat, lng, radius: radiusKm, category, ...extraParams },
    }),

  // Heatmap data — all complaints with lat/lng and priority weight
  getHeatmapData: () => api.get("/complaints/heatmap"),

  // Submit feedback
  submitFeedback: (complaintId, data) =>
    api.post(`/complaints/${complaintId}/feedback`, data),

  // Get feedback
  getFeedback: (complaintId) => api.get(`/complaints/${complaintId}/feedback`),

  // Get the current user's feedback status for a complaint
  getMyFeedback: (complaintId) =>
    api.get(`/complaints/${complaintId}/feedback/me`),

  // Get feedback stats
  getFeedbackStats: (complaintId) =>
    api.get(`/complaints/${complaintId}/feedback/stats`),

  // Get all citizen feedback entries
  getAllFeedback: () => api.get("/complaints/feedback/all"),

  // Delete a complaint
  delete: (id) => api.delete(`/complaints/${id}`),
};

// ─── Servant (department officer) API calls ───────────────────────────
export const servantAPI = {
  getStats: (params = {}) => api.get("/servant/stats", { params }),
  getComplaints: (params = {}) => api.get("/servant/complaints", { params }),
  getComplaint: (id) => api.get(`/servant/complaints/${id}`),
  updateStatus: (id, status, note = "") =>
    api.put(`/servant/complaints/${id}/status`, { status, note }),
  setSLA: (id, hours) => api.put(`/servant/complaints/${id}/sla`, { hours }),
};

// ─── Notification API calls ──────────────────────────────────────────
export const notificationAPI = {
  getAll: () => api.get("/notifications"),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put("/notifications/read-all"),
};

export const emergencyBroadcastAPI = {
  getAll: () => api.get("/emergency-broadcasts"),
  create: (data) => api.post("/emergency-broadcasts", data),
};

export const reportAPI = {
  downloadComplaintReport: (id) =>
    api.get(`/reports/complaint/${id}`, { responseType: 'blob' }),
  downloadSummaryReport: (params) =>
    api.get('/reports/summary', { params, responseType: 'blob' }),
};

export default api;
