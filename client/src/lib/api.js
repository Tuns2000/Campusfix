import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Базовый URL API
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Создаем API сервис с RTK Query
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      // Получаем токен из состояния
      const token = getState().auth.token;
      
      // Если токен есть, добавляем его в заголовки
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      
      return headers;
    },
  }),
  tagTypes: ['User', 'Project', 'Defect', 'Report', 'Attachment'],
  endpoints: (builder) => ({
    // Аутентификация
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    
    // Пользователи
    getUsers: builder.query({
      query: () => '/users',
      providesTags: ['User'],
    }),
    
    getUserById: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    
    // Проекты
    getProjects: builder.query({
      query: () => '/projects',
      providesTags: ['Project'],
    }),
    
    getProjectById: builder.query({
      query: (id) => `/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),
    
    createProject: builder.mutation({
      query: (projectData) => ({
        url: '/projects',
        method: 'POST',
        body: projectData,
      }),
      invalidatesTags: ['Project'],
    }),
    
    updateProject: builder.mutation({
      query: ({ id, ...projectData }) => ({
        url: `/projects/${id}`,
        method: 'PUT',
        body: projectData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }],
    }),
    
    deleteProject: builder.mutation({
      query: (id) => ({
        url: `/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project'],
    }),
    
    // Дефекты
    getDefects: builder.query({
      query: (params) => ({
        url: '/defects',
        params,
      }),
      providesTags: ['Defect'],
    }),
    
    getDefectById: builder.query({
      query: (id) => `/defects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Defect', id }],
    }),
    
    createDefect: builder.mutation({
      query: (defectData) => ({
        url: '/defects',
        method: 'POST',
        body: defectData,
      }),
      invalidatesTags: ['Defect'],
    }),
    
    updateDefect: builder.mutation({
      query: ({ id, ...defectData }) => ({
        url: `/defects/${id}`,
        method: 'PUT',
        body: defectData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Defect', id }],
    }),
    
    deleteDefect: builder.mutation({
      query: (id) => ({
        url: `/defects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Defect'],
    }),
    
    // Отчеты
    getReports: builder.query({
      query: (params) => ({
        url: '/reports',
        params,
      }),
      providesTags: ['Report'],
    }),
    
    // Вложения
    uploadAttachment: builder.mutation({
      query: ({ defectId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        
        return {
          url: `/attachments/${defectId}`,
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: (result, error, { defectId }) => [
        { type: 'Defect', id: defectId },
        'Attachment',
      ],
    }),
    
    deleteAttachment: builder.mutation({
      query: (id) => ({
        url: `/attachments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Attachment', 'Defect'],
    }),
  }),
});

// Экспортируем хуки для использования в компонентах
export const {
  useLoginMutation,
  useRegisterMutation,
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetDefectsQuery,
  useGetDefectByIdQuery,
  useCreateDefectMutation,
  useUpdateDefectMutation,
  useDeleteDefectMutation,
  useGetReportsQuery,
  useUploadAttachmentMutation,
  useDeleteAttachmentMutation,
} = api;