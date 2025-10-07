import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import defectsReducer from './slices/defectsSlice';
import projectsReducer from './slices/projectsSlice';
import profileReducer from './slices/profileSlice';
import usersReducer from './slices/usersSlice'; // Добавляем новый редьюсер

export const store = configureStore({
  reducer: {
    auth: authReducer,
    defects: defectsReducer,
    projects: projectsReducer,
    profile: profileReducer,
    users: usersReducer,  // Добавляем в хранилище
  },
});

export default store;