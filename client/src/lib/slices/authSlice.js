import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../api';

// Асинхронные thunk-действия
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      const { token, user } = response.data;
      
      // Сохраняем токен в локальное хранилище
      localStorage.setItem('token', token);
      
      return { user, token };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Ошибка при входе в систему'
      );
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      console.log("Отправляемые данные:", userData);
      const response = await authApi.register(userData);
      const { token, user } = response.data;
      
      // Сохраняем токен в локальное хранилище
      localStorage.setItem('token', token);
      
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

export const logout = createAsyncThunk('auth/logout', async () => {
  // Удаляем токен из локального хранилища
  localStorage.removeItem('token');
  return null;
});

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      
      // Если токена нет, прекращаем выполнение
      if (!token) {
        return rejectWithValue('Токен не найден');
      }
      
      // Проверяем токен, делая запрос на получение данных текущего пользователя
      const response = await authApi.getMe();
      return { user: response.data.user, token };
    } catch (error) {
      // В случае ошибки удаляем невалидный токен
      localStorage.removeItem('token');
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
      await authApi.changePassword(passwordData);
      return { success: true };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Ошибка при изменении пароля'
      );
    }
  }
);

// Создание slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    loading: false,
    error: null,
    passwordChangeSuccess: false,
  },
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
      });
  },
});

export const { clearError, clearPasswordChangeSuccess } = authSlice.actions;

export default authSlice.reducer;