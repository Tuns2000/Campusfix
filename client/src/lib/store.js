import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import projectsReducer from './slices/projectsSlice';
import defectsReducer from './slices/defectsSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    defects: defectsReducer,
    // ... другие редьюсеры по мере добавления
  },
});

export default store;