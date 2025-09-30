import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    // Здесь будут добавляться другие редьюсеры
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;