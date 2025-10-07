import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api';

// Начальное состояние должно проверять localStorage
const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null
};

// Асинхронные thunk-действия
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      
      // Сохраняем токен и данные пользователя в localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Устанавливаем токен в заголовки запросов
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Ошибка авторизации' }
      );
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      console.log("Отправляемые данные:", userData);
      const response = await api.post('/auth/register', userData); // Заменено на api.post
      const { token, user } = response.data;
      
      // Сохраняем токен в локальное хранилище
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user)); // Добавлено сохранение пользователя
      
      return { user, token };
    } catch (error) {
      console.error("Ошибка при регистрации:", error);
      
      // Более детальное логирование
      if (error.response?.data) {
        console.error("Данные ошибки:", error.response.data);
        // Возвращаем строку с сообщением, а не весь объект
        return rejectWithValue(error.response.data.message || 'Ошибка регистрации');
      } else if (error.request) {
        // Запрос был сделан, но ответа не получено
        console.error("Нет ответа от сервера:", error.request);
        return rejectWithValue('Сервер недоступен. Пожалуйста, попробуйте позже.');
      } else {
        // Что-то случилось при настройке запроса
        console.error("Ошибка настройки запроса:", error.message);
        return rejectWithValue('Ошибка при отправке запроса: ' + error.message);
      }
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Удаляем данные из localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Удаляем токен из заголовков
      delete api.defaults.headers.common['Authorization'];
      
      return { success: true };
    } catch (error) {
      return rejectWithValue({ message: 'Ошибка при выходе' });
    }
  }
);

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return rejectWithValue('Токен не найден');
      }
      
      // Добавьте отладочный вывод
      console.log('Проверка токена:', token);
      
      // Используем другой эндпоинт для проверки (на случай если /auth/me не работает)
      const response = await api.get('/auth/check');
      console.log('Ответ сервера при проверке токена:', response.data);
      
      // Если пользователя нет в ответе, используем данные из localStorage
      const user = response.data.user || JSON.parse(localStorage.getItem('user'));
      
      return { user, token };
    } catch (error) {
      console.error('Ошибка проверки аутентификации:', error);
      
      // Если сервер временно недоступен, сохраняем текущую сессию
      if (error.code === 'ECONNABORTED' || !error.response) {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('token');
        
        // Если есть локальные данные, считаем пользователя авторизованным
        if (user && token) {
          return { user, token };
        }
      }
      
      // Очищаем данные только при явной ошибке аутентификации
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return rejectWithValue(
        error.response?.data?.message || 'Ошибка аутентификации'
      );
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwordData, { rejectWithValue }) => {
    try {
      await api.post('/auth/change-password', passwordData); // Заменено на api.post
      return { success: true };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Ошибка при изменении пароля'
      );
    }
  }
);

export const checkTokenValidity = createAsyncThunk(
  'auth/checkToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/check');
      return response.data;
    } catch (error) {
      // Если токен недействителен, очищаем localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      
      return rejectWithValue(
        error.response?.data || { message: 'Сессия истекла' }
      );
    }
  }
);

// Создание slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPasswordChangeSuccess: (state) => {
      state.passwordChangeSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Обработка login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      
      // Обработка register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      
      // Обработка logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      
      // Обработка checkAuth
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
      })
      
      // Обработка changePassword
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.passwordChangeSuccess = false;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
        state.passwordChangeSuccess = true;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.passwordChangeSuccess = false;
      })
      
      // Обработка checkTokenValidity
      .addCase(checkTokenValidity.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkTokenValidity.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(checkTokenValidity.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });
  },
});

export const { clearError, clearPasswordChangeSuccess } = authSlice.actions;

export default authSlice.reducer;