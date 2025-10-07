import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import defectsReducer from './slices/defectsSlice';
import projectsReducer from './slices/projectsSlice';
import profileReducer from './slices/profileSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    defects: defectsReducer,
    projects: projectsReducer,
    profile: profileReducer,
  },
});

export default store;