import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth, checkTokenValidity } from './lib/slices/authSlice';
import api from './lib/api';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';

// Импорт тем и компонентов
import theme from './styles/theme';

// Импорт компонентов макета
import MainLayout from './components/layouts/MainLayout';

// Импорт компонентов страниц
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ProjectList from './pages/projects/ProjectList';
import ProjectDetails from './pages/projects/ProjectDetails';
import ProjectForm from './pages/projects/ProjectForm';
import DefectList from './pages/defects/DefectList';
import DefectDetails from './pages/defects/DefectDetails';
import DefectForm from './pages/defects/DefectForm';
import ProfilePage from './pages/profile/ProfilePage';  // Добавляем импорт компонента профиля
import NotFound from './pages/NotFound';
import LoadingScreen from './components/common/LoadingScreen';

// Защищенный маршрут
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, isAuthenticated, loading } = useSelector(state => state.auth);
  
  if (loading) {
    return <div>Загрузка...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }
  
  return children;
};

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading } = useSelector(state => state.auth);
  
  // Добавляем эффект для проверки токена при загрузке
  useEffect(() => {
    // Проверка наличия токена
    const token = localStorage.getItem('token');
    
    if (token) {
      // Устанавливаем токен в заголовки запросов
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Можно также добавить проверку валидности токена на сервере
      dispatch(checkTokenValidity());
    }
  }, [dispatch]);
  
  useEffect(() => {
    // Важно: запускаем проверку аутентификации при загрузке приложения
    const token = localStorage.getItem('token');
    if (token && !isAuthenticated) {
      console.log('Проверка аутентификации при загрузке приложения...');
      dispatch(checkAuth());
    }
  }, [dispatch, isAuthenticated]);
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <CssBaseline />
        <Routes>
          {/* Публичные маршруты */}
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />

          {/* Защищенные маршруты */}
          <Route
            path="/"
            element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}
          >
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<ProjectList />} />
            <Route path="projects/new" element={<ProjectForm />} />
            <Route path="projects/:id" element={<ProjectDetails />} />
            <Route path="projects/:id/edit" element={<ProjectForm />} />
            <Route path="defects" element={<DefectList />} />
            <Route path="defects/new" element={<DefectForm />} />
            <Route path="defects/:id" element={<DefectDetails />} />
            <Route path="defects/:id/edit" element={<DefectForm />} />
            <Route path="profile" element={<ProfilePage />} />  {/* Добавляем маршрут профиля */}
          </Route>

          {/* Маршрут "Не найдено" */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;