import axios from 'axios';

// Базовый URL API
const API_BASE_URL = 'http://localhost:3001/api';

// Получение токена из localStorage
const token = localStorage.getItem('token');

// Настройка axios
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
});

// Интерцептор
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Логируем отправляемые данные для отладки
    if (config.method === 'post' || config.method === 'put') {
      console.log(`📤 ${config.method.toUpperCase()} ${config.url}:`, config.data);
    }
    
    return config;
  },
  error => Promise.reject(error)
);

// Настройка перехватчика ответов для обработки ошибок аутентификации
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Если сервер вернул ошибку 401 (неавторизован), выходим из системы
    if (error.response && error.response.status === 401) {
      // Очищаем данные авторизации
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Перенаправляем на страницу входа, если не на ней
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Логирование ответов
axiosInstance.interceptors.response.use(
  response => {
    // Успешный ответ
    return response;
  },
  error => {
    // Ошибка ответа
    console.error(`🔴 Ошибка API (${error.config?.url}):`, error.response?.data || error.message);
    
    // Если ошибка 500, добавляем информацию для отладки
    if (error.response && error.response.status === 500) {
      console.error('Внутренняя ошибка сервера. Проверьте логи сервера.');
    }
    
    return Promise.reject(error);
  }
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
  getAll: (filters = {}) => {
    // Очистка фильтров от несериализуемых данных
    const cleanFilters = Object.fromEntries(
      Object.entries(filters)
        .filter(([key, value]) => {
          // Исключаем объекты событий и другие несериализуемые типы
          return (
            value === null ||
            value === undefined ||
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean' ||
            (typeof value === 'object' && 
             (Array.isArray(value) || value instanceof Date))
          );
        })
    );
    
    // Затем делаем запрос с очищенными фильтрами
    return axiosInstance.get('/defects', { params: cleanFilters });
  },
  getById: (id) => axiosInstance.get(`/defects/${id}`),
  create: (data) => {
    // Преобразование приоритета
    let priority = data.priority;
    
    // Если приоритет на английском, преобразуем его в русский
    if (['low', 'medium', 'high', 'critical'].includes(priority)) {
      const priorityMap = {
        'low': 'низкий',
        'medium': 'средний',
        'high': 'высокий',
        'critical': 'критический'
      };
      priority = priorityMap[priority] || 'средний';
    }
    
    // Создаем объект с правильными полями и порядком
    const adaptedData = {
      title: data.title,
      description: data.description,
      project_id: data.project_id || data.projectId,
      stage_id: data.stage_id || null,
      status: data.status || 'новый',
      priority: priority,
      reported_by: data.reported_by || data.reporter_id || 3, // Важно! Этот параметр обязателен
      assigned_to: data.assigned_to || null,
      location: data.location || '',
      steps_to_reproduce: data.steps_to_reproduce || '',
      expected_result: data.expected_result || '',
      actual_result: data.actual_result || ''
    };
    
    console.log('Адаптированные данные для API:', adaptedData);
    return axiosInstance.post('/defects', adaptedData);
  },
  update: (id, data) => axiosInstance.put(`/defects/${id}`, data),
  delete: (id) => axiosInstance.delete(`/defects/${id}`),
  addComment: (defectId, commentData) => {
    // Убедимся, что отправляем только поле 'text'
    const payload = { text: commentData.text };
    
    console.log(`Отправка комментария к дефекту ${defectId}:`, payload);
    return axiosInstance.post(`/defects/${defectId}/comments`, payload);
  },
  uploadAttachments: (defectId, files) => {
    if (!files || files.length === 0) {
      console.log('Нет файлов для загрузки');
      return Promise.resolve({ data: { success: true } });
    }
    
    const formData = new FormData();
    
    // Изменить название поля с 'files' на 'file'
    for (let i = 0; i < files.length; i++) {
      formData.append('file', files[i]);
    }
    
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
  create: (userData) => axiosInstance.post('/users', userData),
  update: (id, userData) => axiosInstance.put(`/users/${id}`, userData),
  delete: (id) => axiosInstance.delete(`/users/${id}`),
  
  // Новые методы для работы с профилем
  getProfile: () => axiosInstance.get('/users/profile'),
  updateProfile: (profileData) => axiosInstance.put('/users/profile', profileData),
  changePassword: (passwordData) => axiosInstance.put('/users/change-password', passwordData),
  uploadAvatar: (formData) => axiosInstance.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Обновленные функции для работы с отчетами
export const reportsApi = {
  // Экспорт отчета по дефектам
  exportDefects: async (format = 'excel', filters = {}) => {
    try {
      const queryParams = new URLSearchParams({ format, ...filters });
      const response = await fetch(`${API_BASE_URL}/reports/defects?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при экспорте данных');
      }
      
      // Получаем имя файла из заголовка ответа
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName;

      if (contentDisposition) {
        fileName = contentDisposition.split('filename=')[1].replace(/"/g, '');
      } else {
        // Используем правильное расширение
        const extension = format === 'excel' ? 'xlsx' : 'csv';
        fileName = `defects_report.${extension}`;
      }
      
      // Создаем ссылку для скачивания файла
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Принудительно проверяем расширение и исправляем его если нужно
      if (format === 'excel' && fileName.endsWith('.excel')) {
        fileName = fileName.replace('.excel', '.xlsx');
      }
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Очищаем ресурсы
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка при экспорте дефектов:', error);
      alert('Не удалось экспортировать данные: ' + error.message);
      return { success: false, message: error.message };
    }
  },
  
  // Экспорт отчета по проектам - аналогично для проектов
  exportProjects: async (format = 'excel') => {
    try {
      const queryParams = new URLSearchParams({ format });
      const response = await fetch(`${API_BASE_URL}/reports/projects?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при экспорте данных');
      }
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let fileName;

      if (contentDisposition) {
        fileName = contentDisposition.split('filename=')[1].replace(/"/g, '');
      } else {
        // Используем правильное расширение
        const extension = format === 'excel' ? 'xlsx' : 'csv';
        fileName = `projects_report.${extension}`;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Принудительно проверяем расширение и исправляем его если нужно
      if (format === 'excel' && fileName.endsWith('.excel')) {
        fileName = fileName.replace('.excel', '.xlsx');
      }
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка при экспорте проектов:', error);
      alert('Не удалось экспортировать данные: ' + error.message);
      return { success: false, message: error.message };
    }
  }
};

export default axiosInstance;

// Функция для преобразования значений приоритета
function mapPriorityToRussian(priority) {
  const priorityMap = {
    'low': 'низкий',
    'medium': 'средний',
    'high': 'высокий',
    'critical': 'критический'
  };
  return priorityMap[priority] || 'средний';
}

// Получение ID текущего пользователя из Redux или localStorage
function getCurrentUserId() {
  // Проверяем localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.id || 1; // Возвращаем ID по умолчанию, если не найден
}