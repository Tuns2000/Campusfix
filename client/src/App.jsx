import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from './lib/slices/authSlice';
import MainLayout from './components/layouts/MainLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
// import ProjectList from './pages/projects/ProjectList';
// import ProjectDetails from './pages/projects/ProjectDetails';
// import DefectList from './pages/defects/DefectList';
// import DefectDetails from './pages/defects/DefectDetails';
// import UserList from './pages/users/UserList';
// import UserProfile from './pages/users/UserProfile';
// import Reports from './pages/reports/Reports';
import NotFound from './pages/NotFound';
import LoadingScreen from './components/common/LoadingScreen';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// Защищенный маршрут - проверяет аутентификацию
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);
  
  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  
  // Если не авторизован, перенаправляем на страницу входа
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Если указаны роли и у пользователя нет доступа, показываем сообщение
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // Если все проверки пройдены, показываем содержимое
  return children;
};

function App() {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  
  // Проверка токена при загрузке приложения
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);
  
  if (loading) {
    return <LoadingScreen />;
  }
  
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
        
        <Route path="projects">
          <Route index element={<div>Список проектов</div>} />
          <Route path=":id" element={<div>Детали проекта</div>} />
        </Route>
        
        <Route path="defects">
          <Route index element={<div>Список дефектов</div>} />
          <Route path=":id" element={<div>Детали дефекта</div>} />
        </Route>
        
        <Route path="users">
          <Route index element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <div>Список пользователей</div>
            </ProtectedRoute>
          } />
          <Route path=":id" element={<div>Профиль пользователя</div>} />
        </Route>
        
        <Route path="reports" element={<div>Отчеты</div>} />
        
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;