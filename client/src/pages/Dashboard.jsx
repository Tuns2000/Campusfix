import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  BugReport as BugReportIcon,
  Business as BusinessIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Flag as FlagIcon,
  PendingActions as PendingActionsIcon,
  Person as PersonIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { fetchProjects } from '../lib/slices/projectsSlice';
import { fetchDefects } from '../lib/slices/defectsSlice';
import LoadingScreen from '../components/common/LoadingScreen';

const DashboardCard = ({ title, value, icon, color, bgColor, onClick }) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        borderRadius: 3,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[6]
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: bgColor || alpha(theme.palette[color || 'primary'].main, 0.1),
              color: color ? theme.palette[color].main : theme.palette.primary.main,
              width: 48, 
              height: 48,
              mr: 2
            }}
          >
            {icon}
          </Avatar>
          <Typography variant="h6" fontWeight="medium">
            {title}
          </Typography>
        </Box>
        <Typography variant="h3" fontWeight="bold">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { projects, loading: projectsLoading } = useSelector((state) => state.projects);
  const { defects, loading: defectsLoading } = useSelector((state) => state.defects);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalDefects: 0,
    openDefects: 0,
    resolvedDefects: 0,
    highPriorityDefects: 0
  });
  
  // Загрузка данных
  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchDefects());
  }, [dispatch]);
  
  // Расчет статистики
  useEffect(() => {
    if (projects.length > 0 || defects.length > 0) {
      setStats({
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active' || p.status === 'in_progress').length,
        completedProjects: projects.filter(p => p.status === 'completed').length,
        totalDefects: defects.length,
        openDefects: defects.filter(d => d.status === 'new' || d.status === 'in_progress' || d.status === 'reopened').length,
        resolvedDefects: defects.filter(d => d.status === 'resolved' || d.status === 'closed').length,
        highPriorityDefects: defects.filter(d => d.priority === 'high').length
      });
    }
  }, [projects, defects]);
  
  // Получение приоритетных дефектов для текущего пользователя
  const getMyAssignedDefects = () => {
    if (!user || !user.id) return [];
    
    return defects
      .filter(d => d.assigned_to === user.id && (d.status === 'new' || d.status === 'in_progress' || d.status === 'reopened'))
      .sort((a, b) => {
        // Сначала по приоритету
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Затем по дате обновления
        return new Date(b.updated_at) - new Date(a.updated_at);
      })
      .slice(0, 5); // Только 5 дефектов
  };
  
  // Получение активных проектов
  const getActiveProjects = () => {
    return projects
      .filter(p => p.status === 'active' || p.status === 'in_progress')
      .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
      .slice(0, 5); // Только 5 проектов
  };
  
  // Расчет процента выполнения проекта (упрощенно)
  const calculateProgress = (project) => {
    if (project.status === 'completed') return 100;
    if (project.status === 'planned') return 0;
    
    // Простой расчет на основе времени
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    const today = new Date();
    
    if (today < startDate) return 0;
    if (today > endDate) return 100;
    
    const totalDuration = endDate - startDate;
    const elapsedDuration = today - startDate;
    return Math.round((elapsedDuration / totalDuration) * 100);
  };
  
  // Получение статуса дефекта на русском и цвета
  const getDefectStatusInfo = (status) => {
    switch (status) {
      case 'new':
        return { label: 'Новый', color: 'info' };
      case 'in_progress':
        return { label: 'В работе', color: 'warning' };
      case 'resolved':
        return { label: 'Решен', color: 'success' };
      case 'closed':
        return { label: 'Закрыт', color: 'success' };
      case 'reopened':
        return { label: 'Переоткрыт', color: 'error' };
      default:
        return { label: status, color: 'default' };
    }
  };
  
  // Получение приоритета дефекта на русском и цвета
  const getDefectPriorityInfo = (priority) => {
    switch (priority) {
      case 'high':
        return { label: 'Высокий', color: 'error' };
      case 'medium':
        return { label: 'Средний', color: 'warning' };
      case 'low':
        return { label: 'Низкий', color: 'success' };
      default:
        return { label: priority, color: 'default' };
    }
  };
  
  // Получение иконки по статусу проекта
  const getProjectStatusIcon = (status) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return <PlayArrowIcon />;
      case 'completed':
        return <CheckCircleIcon />;
      case 'planned':
        return <PendingActionsIcon />;
      default:
        return <FlagIcon />;
    }
  };
  
  // Загрузка данных
  if ((projectsLoading && projects.length === 0) || (defectsLoading && defects.length === 0)) {
    return <LoadingScreen />;
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Заголовок дашборда */}
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          Панель управления
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Добро пожаловать, {user?.name || 'Пользователь'}! Здесь вы можете увидеть общую статистику по проектам и дефектам.
        </Typography>
        
        {/* Статистические карточки */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* Проекты */}
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard 
              title="Всего проектов"
              value={stats.totalProjects}
              icon={<BusinessIcon />}
              color="primary"
              onClick={() => window.location.href = '/projects'}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard 
              title="Активные проекты"
              value={stats.activeProjects}
              icon={<PlayArrowIcon />}
              color="info"
              onClick={() => window.location.href = '/projects?status=active'}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard 
              title="Завершённые проекты"
              value={stats.completedProjects}
              icon={<CheckCircleIcon />}
              color="success"
              onClick={() => window.location.href = '/projects?status=completed'}
            />
          </Grid>
          
          {/* Дефекты */}
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard 
              title="Всего дефектов"
              value={stats.totalDefects}
              icon={<BugReportIcon />}
              color="error"
              onClick={() => window.location.href = '/defects'}
            />
          </Grid>
        </Grid>
        
        {/* Вторая строка карточек статистики */}
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard 
              title="Открытые дефекты"
              value={stats.openDefects}
              icon={<ErrorOutlineIcon />}
              color="warning"
              onClick={() => window.location.href = '/defects?status=new'}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard 
              title="Решённые дефекты"
              value={stats.resolvedDefects}
              icon={<CheckCircleIcon />}
              color="success"
              onClick={() => window.location.href = '/defects?status=resolved'}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <DashboardCard 
              title="Высокий приоритет"
              value={stats.highPriorityDefects}
              icon={<FlagIcon />}
              color="error"
              onClick={() => window.location.href = '/defects?priority=high'}
            />
          </Grid>
        </Grid>
        
        {/* Разделы с проектами и дефектами */}
        <Grid container spacing={4} sx={{ mt: 4 }}>
          {/* Активные проекты */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3 }}>
              <Box sx={{ 
                p: 3, 
                pb: 2,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      width: 40, 
                      height: 40,
                      mr: 2
                    }}
                  >
                    <BusinessIcon />
                  </Avatar>
                  <Typography variant="h6" fontWeight="bold">
                    Активные проекты
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  size="small"
                  component={Link}
                  to="/projects"
                >
                  Все проекты
                </Button>
              </Box>
              <Divider />
              {getActiveProjects().length > 0 ? (
                <List sx={{ p: 0 }}>
                  {getActiveProjects().map((project) => {
                    const progress = calculateProgress(project);
                    
                    return (
                      <ListItem 
                        key={project.id}
                        sx={{ 
                          px: 3, 
                          py: 2,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          '&:last-child': {
                            borderBottom: 'none'
                          }
                        }}
                        button
                        component={Link}
                        to={`/projects/${project.id}`}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main
                          }}>
                            {getProjectStatusIcon(project.status)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={project.name}
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Прогресс
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {progress}%
                                </Typography>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={progress} 
                                sx={{ 
                                  height: 6, 
                                  borderRadius: 3,
                                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 3
                                  }
                                }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                Срок: {new Date(project.end_date).toLocaleDateString('ru-RU')}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Нет активных проектов
                  </Typography>
                  {user && ['admin', 'manager'].includes(user.role) && (
                    <Button
                      variant="contained"
                      component={Link}
                      to="/projects/new"
                      sx={{ mt: 2 }}
                    >
                      Создать проект
                    </Button>
                  )}
                </Box>
              )}
            </Card>
          </Grid>
          
          {/* Назначенные дефекты */}
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3 }}>
              <Box sx={{ 
                p: 3, 
                pb: 2,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: alpha(theme.palette.error.main, 0.1),
                      color: theme.palette.error.main,
                      width: 40, 
                      height: 40,
                      mr: 2
                    }}
                  >
                    <BugReportIcon />
                  </Avatar>
                  <Typography variant="h6" fontWeight="bold">
                    Мои дефекты
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  size="small"
                  component={Link}
                  to={`/defects?assigned_to=${user?.id || ''}`}
                >
                  Все мои дефекты
                </Button>
              </Box>
              <Divider />
              {getMyAssignedDefects().length > 0 ? (
                <List sx={{ p: 0 }}>
                  {getMyAssignedDefects().map((defect) => {
                    const statusInfo = getDefectStatusInfo(defect.status);
                    const priorityInfo = getDefectPriorityInfo(defect.priority);
                    
                    return (
                      <ListItem 
                        key={defect.id}
                        sx={{ 
                          px: 3, 
                          py: 2,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          '&:last-child': {
                            borderBottom: 'none'
                          }
                        }}
                        button
                        component={Link}
                        to={`/defects/${defect.id}`}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: alpha(theme.palette[priorityInfo.color].main, 0.1),
                            color: theme.palette[priorityInfo.color].main
                          }}>
                            <BugReportIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={defect.title}
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {defect.project_name || 'Без проекта'}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Chip 
                                  label={statusInfo.label} 
                                  color={statusInfo.color} 
                                  size="small" 
                                />
                                <Chip 
                                  label={priorityInfo.label} 
                                  color={priorityInfo.color} 
                                  size="small" 
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Нет назначенных вам дефектов
                  </Typography>
                  <Button
                    variant="contained"
                    component={Link}
                    to="/defects/new"
                    sx={{ mt: 2 }}
                  >
                    Создать дефект
                  </Button>
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>
      </motion.div>
    </Box>
  );
};

export default Dashboard;