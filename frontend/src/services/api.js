import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Add JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Schedule APIs
export const scheduleAPI = {
  uploadExcel: (formData) => api.post('/schedule/upload-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/schedule', { params }),
  getById: (id) => api.get(`/schedule/${id}`),
  getBatches: () => api.get('/schedule/batches'),
};

// Shipment APIs
export const shipmentAPI = {
  create: (data) => api.post('/shipments', data),
  getAll: () => api.get('/shipments'),
  getById: (id) => api.get(`/shipments/${id}`),
  delete: (id) => api.delete(`/shipments/${id}`),
  uploadDocument: (id, formData) => api.post(`/shipments/${id}/upload-documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Dashboard APIs
export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
  getSupplierWise: () => api.get('/dashboard/supplier-wise'),
  getStatusWise: () => api.get('/dashboard/status-wise'),
  getDailyDispatch: () => api.get('/dashboard/daily-dispatch'),
  getDelayed: () => api.get('/dashboard/delayed'),
};

// Report APIs (returns blobs for download)
export const reportAPI = {
  fullShipment: () => api.get('/reports/full-shipment-excel', { responseType: 'blob' }),
  supplierWise: () => api.get('/reports/supplier-wise', { responseType: 'blob' }),
  poWise: () => api.get('/reports/po-wise', { responseType: 'blob' }),
  pending: () => api.get('/reports/pending', { responseType: 'blob' }),
  delayed: () => api.get('/reports/delayed', { responseType: 'blob' }),
  todayExpected: () => api.get('/reports/today-expected', { responseType: 'blob' }),
};

// Email APIs
export const emailAPI = {
  sendReminder: (data) => api.post('/email/send-reminder', data),
};

// Users/Suppliers APIs
export const userAPI = {
  getAll: () => api.get('/users'),
};
export const supplierAPI = {
  getAll: () => api.get('/suppliers'),
};

// ASN APIs
export const asnAPI = {
  createDraft: (data) => api.post('/asn/draft', data),
  submitASN: (data) => api.post('/asn/submit', data),
  getAll: (params) => api.get('/asn', { params }),
  getById: (id) => api.get(`/asn/${id}`),
  update: (id, data) => api.put(`/asn/${id}`, data),
  cancel: (id) => api.post(`/asn/${id}/cancel`),
  uploadDocument: (id, formData) => api.post(`/asn/${id}/upload-documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getQRCode: (id) => api.get(`/asn/${id}/qr`),
  saveCNDN: (id, data) => api.post(`/asn/${id}/cndn`, data),
  getCNDN: (id) => api.get(`/asn/cndn/${id}`)
};

// Gate APIs
export const gateAPI = {
  getTodayExpected: () => api.get('/gate/today-expected'),
  searchASN: (query) => api.get('/gate/search', { params: { query } }),
  scanQR: (qrToken) => api.post('/gate/scan-qr', { qrToken }),
  markGateIn: (asnId, data) => api.post(`/gate/${asnId}/mark-gate-in`, data),
  holdVehicle: (gateEntryId, data) => api.post(`/gate/${gateEntryId}/hold`, data),
  releaseHold: (gateEntryId) => api.post(`/gate/${gateEntryId}/release-hold`)
};

// ERP APIs
export const erpAPI = {
  getConfig: () => api.get('/erp/config'),
  saveConfig: (data) => api.post('/erp/config', data),
  syncGateEntry: (gateEntryId) => api.post(`/erp/gate-entry/${gateEntryId}/sync`),
  retryGateEntry: (gateEntryId) => api.post(`/erp/gate-entry/${gateEntryId}/retry`),
  getLogs: () => api.get('/erp/logs')
};

export default api;
