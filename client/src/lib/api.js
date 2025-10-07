import axios from 'axios';

// Базовый URL API
const API_BASE_URL = 'http://localhost:3001/api';

// Настройка axios
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Интерцептор для добавления токена авторизации
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// API для аутентификации
export const authApi = {
  login: (credentials) => axiosInstance.post('/auth/login', credentials),
  register: (userData) => axiosInstance.post('/auth/register', userData),
  checkAuth: () => axiosInstance.get('/auth/me'),
  logout: () => axiosInstance.post('/auth/logout')
};

// API для проектов
export const projectsApi = {
  getAll: (filters = {}) => axiosInstance.get('/projects', { params: filters }),
  getById: (id) => axiosInstance.get(`/projects/${id}`),
  create: (data) => axiosInstance.post('/projects', data),
  update: (id, data) => axiosInstance.put(`/projects/${id}`, data),
  delete: (id) => axiosInstance.delete(`/projects/${id}`)
};

// API для дефектов
export const defectsApi = {
  getAll: (filters = {}) => axiosInstance.get('/defects', { params: filters }),
  getById: (id) => axiosInstance.get(`/defects/${id}`),
  create: (data) => axiosInstance.post('/defects', data),
  update: (id, data) => axiosInstance.put(`/defects/${id}`, data),
  delete: (id) => axiosInstance.delete(`/defects/${id}`),
  addComment: (defectId, comment) => axiosInstance.post(`/defects/${defectId}/comments`, comment),
  uploadAttachments: (defectId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    return axiosInstance.post(`/defects/${defectId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

// API для вложений
export const attachmentsApi = {
  download: (id) => axiosInstance.get(`/attachments/${id}`, { responseType: 'blob' }),
  delete: (id) => axiosInstance.delete(`/attachments/${id}`)
};

// API для пользователей
export const usersApi = {
  getAll: () => axiosInstance.get('/users'),
  getById: (id) => axiosInstance.get(`/users/${id}`),
  update: (id, data) => axiosInstance.put(`/users/${id}`, data),
  delete: (id) => axiosInstance.delete(`/users/${id}`)
};

// API для отчетов
export const reportsApi = {
  getProjectsStats: () => axiosInstance.get('/reports/projects'),
  getDefectsStats: () => axiosInstance.get('/reports/defects'),
  getUsersStats: () => axiosInstance.get('/reports/users')
};

export default axiosInstance;