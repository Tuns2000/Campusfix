import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// Заменим импорт api на правильный импорт usersApi
import { usersApi } from '../api';

// Начальное состояние
const initialState = {
  profile: null,
  loading: false,
  error: null,
  updateSuccess: false,
  passwordChangeSuccess: false
};

// Асинхронный thunk для получения профиля
export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      // Используем usersApi вместо api
      const response = await usersApi.getProfile();
      return response.data.profile;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Не удалось загрузить профиль');
    }
  }
);

// Асинхронный thunk для обновления профиля
export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      // Используем usersApi вместо api
      const response = await usersApi.updateProfile(profileData);
      return response.data.profile;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Не удалось обновить профиль');
    }
  }
);

// Асинхронный thunk для смены пароля
export const changePassword = createAsyncThunk(
  'profile/changePassword',
  async (passwordData, { rejectWithValue }) => {
    try {
      // Используем usersApi вместо api
      const response = await usersApi.changePassword(passwordData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Не удалось изменить пароль');
    }
  }
);

// Асинхронный thunk для загрузки аватара
export const uploadAvatar = createAsyncThunk(
  'profile/uploadAvatar',
  async (formData, { rejectWithValue }) => {
    try {
      // Используем usersApi вместо api
      const response = await usersApi.uploadAvatar(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Не удалось загрузить аватар');
    }
  }
);

// Создаем slice
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    resetUpdateStatus: (state) => {
      state.updateSuccess = false;
      state.error = null;
    },
    resetPasswordChangeStatus: (state) => {
      state.passwordChangeSuccess = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Обработка получения профиля
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Обработка обновления профиля
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.updateSuccess = true;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.updateSuccess = false;
      })
      
      // Обработка смены пароля
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
      
      // Обработка загрузки аватара
      .addCase(uploadAvatar.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.loading = false;
        if (state.profile) {
          state.profile.avatar = action.payload.avatar;
        }
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { resetUpdateStatus, resetPasswordChangeStatus } = profileSlice.actions;

export default profileSlice.reducer;