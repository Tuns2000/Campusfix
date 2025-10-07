import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth, checkTokenValidity } from './lib/slices/authSlice';
import api from './lib/api';

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
import NotFound from './pages/NotFound';

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
  const { isAuthenticated } = useSelector(state => state.auth);
  
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
  
  return (
    <Routes>
      {/* Публичные маршруты */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Защищенные маршруты */}
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        
        {/* Маршруты проектов */}
        <Route path="projects">
          <Route index element={<ProjectList />} />
          <Route path=":id" element={<ProjectDetails />} />
          <Route path="new" element={
            <ProtectedRoute roles={['admin', 'manager']}>
              <ProjectForm />
            </ProtectedRoute>
          } />
          <Route path=":id/edit" element={
            <ProtectedRoute roles={['admin', 'manager']}>
              <ProjectForm />
            </ProtectedRoute>
          } />
        </Route>
        
        {/* Маршруты дефектов */}
        <Route path="defects">
          <Route index element={<DefectList />} />
          <Route path=":id" element={<DefectDetails />} />
          <Route path="new" element={<DefectForm />} />
          <Route path=":id/edit" element={<DefectForm />} />
        </Route>
      </Route>
      
      {/* Маршрут 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;