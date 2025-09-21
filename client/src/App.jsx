import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from './lib/slices/authSlice';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './styles/theme';

// Заглушки для страниц (будут заменены на реальные компоненты)
const Login = () => <div>Страница входа</div>;
const Register = () => <div>Страница регистрации</div>;
const Dashboard = () => <div>Панель управления</div>;
const Projects = () => <div>Проекты</div>;
const ProjectDetail = () => <div>Детали проекта</div>;
const Defects = () => <div>Дефекты</div>;
const DefectDetail = () => <div>Детали дефекта</div>;
const Reports = () => <div>Отчеты</div>;
const NotFound = () => <div>Страница не найдена</div>;

// Защищенный маршрут
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Открытые маршруты */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Защищенные маршруты */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/projects" element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          } />
          
          <Route path="/projects/:id" element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/defects" element={
            <ProtectedRoute>
              <Defects />
            </ProtectedRoute>
          } />
          
          <Route path="/defects/:id" element={
            <ProtectedRoute>
              <DefectDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          
          {/* Маршрут "404 Not Found" */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;