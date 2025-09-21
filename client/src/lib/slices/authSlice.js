import { createSlice } from '@reduxjs/toolkit';
import { api } from '../api';

// Начальное состояние
const initialState = {
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
};

// Создаем слайс для аутентификации
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Обработка состояний login запроса
      .addMatcher(
        api.endpoints.login.matchPending,
        (state) => {
          state.isLoading = true;
          state.error = null;
        }
      )
      .addMatcher(
        api.endpoints.login.matchFulfilled,
        (state, { payload }) => {
          state.isLoading = false;
          state.user = payload.user;
          state.token = payload.token;
          state.isAuthenticated = true;
          localStorage.setItem('token', payload.token);
        }
      )
      .addMatcher(
        api.endpoints.login.matchRejected,
        (state, { payload }) => {
          state.isLoading = false;
          state.error = payload?.message || 'Ошибка авторизации';
        }
      )
      // Обработка состояний register запроса
      .addMatcher(
        api.endpoints.register.matchPending,
        (state) => {
          state.isLoading = true;
          state.error = null;
        }
      )
      .addMatcher(
        api.endpoints.register.matchFulfilled,
        (state, { payload }) => {
          state.isLoading = false;
          state.user = payload.user;
          state.token = payload.token;
          state.isAuthenticated = true;
          localStorage.setItem('token', payload.token);
        }
      )
      .addMatcher(
        api.endpoints.register.matchRejected,
        (state, { payload }) => {
          state.isLoading = false;
          state.error = payload?.message || 'Ошибка регистрации';
        }
      );
  },
});

export const { logout, clearError } = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;