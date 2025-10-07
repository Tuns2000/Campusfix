import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { defectsApi } from '../api';

// Async thunks
export const fetchDefects = createAsyncThunk(
  'defects/fetchDefects',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await defectsApi.getAll(filters);
      return response.data.defects;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Не удалось получить список дефектов'
      );
    }
  }
);

export const fetchDefectById = createAsyncThunk(
  'defects/fetchDefectById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await defectsApi.getById(id);
      return response.data.defect;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Не удалось получить данные дефекта'
      );
    }
  }
);

// Создание дефекта
export const createDefect = createAsyncThunk(
  'defects/createDefect',
  async ({ defectData, attachments = [] }, { rejectWithValue }) => {
    try {
      console.log('Отправляемые данные:', defectData);
      
      const response = await defectsApi.create(defectData);
      const newDefect = response.data.defect;
      
      // Если есть вложения и дефект успешно создан, загружаем их
      if (attachments.length > 0 && newDefect && newDefect.id) {
        try {
          await defectsApi.uploadAttachments(newDefect.id, attachments);
        } catch (attachmentError) {
          console.error('Ошибка при загрузке вложений:', attachmentError);
          // Продолжаем даже при ошибке загрузки вложений - просто логируем её
          // и не прерываем выполнение, так как основной дефект уже создан
        }
      }
      
      return newDefect;
    } catch (error) {
      console.error('Ошибка при создании дефекта:', error.response?.data || error);
      return rejectWithValue(error.response?.data || {
        success: false,
        message: error.message || 'Не удалось создать дефект'
      });
    }
  }
);

export const updateDefect = createAsyncThunk(
  'defects/updateDefect',
  async ({ id, defectData, attachments }, { rejectWithValue }) => {
    try {
      // Обновляем дефект
      const response = await defectsApi.update(id, defectData);
      const defect = response.data.defect;
      
      // Если есть вложения, загружаем их
      if (attachments && attachments.length > 0) {
        await defectsApi.uploadAttachments(id, attachments);
      }
      
      return defect;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Не удалось обновить дефект'
      );
    }
  }
);

export const deleteDefect = createAsyncThunk(
  'defects/deleteDefect',
  async (id, { rejectWithValue }) => {
    try {
      await defectsApi.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Не удалось удалить дефект'
      );
    }
  }
);

export const addDefectComment = createAsyncThunk(
  'defects/addComment',
  async ({ defectId, comment }, { rejectWithValue }) => {
    try {
      const response = await defectsApi.addComment(defectId, comment);
      return response.data.comment;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Не удалось добавить комментарий'
      );
    }
  }
);

// Начальное состояние
const initialState = {
  defects: [],
  currentDefect: null,
  loading: false,
  error: null,
  createSuccess: false,
  updateSuccess: false,
  deleteSuccess: false,
  filters: {
    status: null,
    priority: null,
    project_id: null,
    assigned_to: null
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0
  }
};

const defectsSlice = createSlice({
  name: 'defects',
  initialState,
  reducers: {
    resetDefectMessages: (state) => {
      state.error = null;
      state.createSuccess = false;
      state.updateSuccess = false;
      state.deleteSuccess = false;
    },
    resetCurrentDefect: (state) => {
      state.currentDefect = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Сбрасываем страницу при изменении фильтров
    },
    setPage: (state, action) => {
      state.pagination.page = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchDefects
      .addCase(fetchDefects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDefects.fulfilled, (state, action) => {
        state.loading = false;
        // Предполагаем, что с сервера возвращается не только список дефектов, но и метаданные пагинации
        if (Array.isArray(action.payload)) {
          state.defects = action.payload;
        } else {
          state.defects = action.payload.items || [];
          state.pagination.total = action.payload.total || state.defects.length;
        }
      })
      .addCase(fetchDefects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // fetchDefectById
      .addCase(fetchDefectById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDefectById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDefect = action.payload;
      })
      .addCase(fetchDefectById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // createDefect
      .addCase(createDefect.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.createSuccess = false;
      })
      .addCase(createDefect.fulfilled, (state, action) => {
        state.loading = false;
        state.defects.unshift(action.payload);
        state.createSuccess = true;
      })
      .addCase(createDefect.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { 
          message: 'Произошла ошибка при создании дефекта'
        };
      })
      
      // updateDefect
      .addCase(updateDefect.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateDefect.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.defects.findIndex(d => d.id === action.payload.id);
        if (index !== -1) {
          state.defects[index] = action.payload;
        }
        state.currentDefect = action.payload;
        state.updateSuccess = true;
      })
      .addCase(updateDefect.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.updateSuccess = false;
      })
      
      // deleteDefect
      .addCase(deleteDefect.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.deleteSuccess = false;
      })
      .addCase(deleteDefect.fulfilled, (state, action) => {
        state.loading = false;
        state.defects = state.defects.filter(d => d.id !== action.payload);
        state.deleteSuccess = true;
      })
      .addCase(deleteDefect.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.deleteSuccess = false;
      })
      
      // addDefectComment
      .addCase(addDefectComment.fulfilled, (state, action) => {
        if (state.currentDefect) {
          if (!state.currentDefect.comments) {
            state.currentDefect.comments = [];
          }
          state.currentDefect.comments.push(action.payload);
        }
      });
  }
});

export const { 
  resetDefectMessages, 
  resetCurrentDefect,
  setFilters,
  setPage 
} = defectsSlice.actions;
export default defectsSlice.reducer;