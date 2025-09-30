import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Создаем экземпляр axios с базовым URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем перехватчик для добавления токена к запросам
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Добавляем перехватчик для обработки ошибок
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Обработка ошибки 401 (Unauthorized)
    if (error.response && error.response.status === 401) {
      // Если токен истек, очищаем локальное хранилище и перезагружаем страницу
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API для аутентификации
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => {
    console.log('Регистрация пользователя с данными:', userData);
    return api.post('/auth/register', userData);
  },
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// API для пользователей
export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
};

// API для проектов
export const projectsApi = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (projectData) => api.post('/projects', projectData),
  update: (id, projectData) => api.put(`/projects/${id}`, projectData),
  delete: (id) => api.delete(`/projects/${id}`),
  
  // API для этапов проекта
  getStages: (projectId) => api.get(`/projects/${projectId}/stages`),
  getStageById: (projectId, stageId) => api.get(`/projects/${projectId}/stages/${stageId}`),
  createStage: (projectId, stageData) => api.post(`/projects/${projectId}/stages`, stageData),
  updateStage: (projectId, stageId, stageData) => api.put(`/projects/${projectId}/stages/${stageId}`, stageData),
  deleteStage: (projectId, stageId) => api.delete(`/projects/${projectId}/stages/${stageId}`),
};

// API для дефектов
export const defectsApi = {
  getAll: (params) => api.get('/defects', { params }),
  getById: (id) => api.get(`/defects/${id}`),
  create: (defectData) => api.post('/defects', defectData),
  update: (id, defectData) => api.put(`/defects/${id}`, defectData),
  delete: (id) => api.delete(`/defects/${id}`),
  
  // API для комментариев к дефектам
  getComments: (defectId) => api.get(`/defects/${defectId}/comments`),
  addComment: (defectId, content) => api.post(`/defects/${defectId}/comments`, { content }),
  updateComment: (defectId, commentId, content) => api.put(`/defects/${defectId}/comments/${commentId}`, { content }),
  deleteComment: (defectId, commentId) => api.delete(`/defects/${defectId}/comments/${commentId}`),
};

// API для вложений
export const attachmentsApi = {
  getByDefect: (defectId) => api.get(`/defects/${defectId}/attachments`),
  getById: (id) => api.get(`/attachments/${id}`),
  upload: (defectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/defects/${defectId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  delete: (id) => api.delete(`/attachments/${id}`),
};

// API для отчетов
export const reportsApi = {
  getDefectsByStatus: (params) => api.get('/reports/defects/status', { params }),
  getDefectsByPriority: (params) => api.get('/reports/defects/priority', { params }),
  getProjectsSummary: () => api.get('/reports/projects/summary'),
  getUsersPerformance: () => api.get('/reports/users/performance'),
  exportDefects: (params) => api.get('/reports/export/defects', { params, responseType: 'blob' }),
  exportProject: (projectId, params) => api.get(`/reports/export/project/${projectId}`, { params, responseType: 'blob' }),
};

export default api;