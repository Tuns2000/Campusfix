import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Button,
  Card,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  Tabs,
  Tab,
  LinearProgress,
  useTheme,
  alpha,
  Paper
} from '@mui/material';
import {
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  ArrowBack as BackIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  Flag as FlagIcon,
  Dashboard as DashboardIcon,
  Assignment as TaskIcon,
  Comment as CommentIcon,
  AttachFile as AttachmentIcon
} from '@mui/icons-material';
import { 
  fetchProjectById, 
  resetCurrentProject,
  deleteProject
} from '../../lib/slices/projectsSlice';
import LoadingScreen from '../../components/common/LoadingScreen';

// Функция форматирования даты
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ru-RU', { 
    day: 'numeric',
    month: 'long', 
    year: 'numeric' 
  });
};

// Получение статуса на русском и цвета
const getStatusInfo = (status) => {
  switch (status) {
    case 'planned':
      return { label: 'Запланирован', color: 'info' };
    case 'in_progress':
      return { label: 'В работе', color: 'warning' };
    case 'completed':
      return { label: 'Завершён', color: 'success' };
    case 'cancelled':
      return { label: 'Отменён', color: 'error' };
    default:
      return { label: status, color: 'default' };
  }
};

// Компонент для вкладки с информацией о проекте
const ProjectOverview = ({ project }) => {
  const theme = useTheme();
  
  // Рассчитываем прогресс проекта (для демо используем фиксированное значение)
  const progress = project.progress || 35;
  
  return (
    <Grid container spacing={3} sx={{ mt: 0 }}>
      <Grid item xs={12} md={8}>
        <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Описание
          </Typography>
          <Typography variant="body1">
            {project.description}
          </Typography>
        </Card>
        
        <Card sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Прогресс
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{ flexGrow: 1, mr: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 10, 
                  borderRadius: 5,
                  backgroundColor: alpha(theme.palette.primary.main, 0.15)
                }}
              />
            </Box>
            <Typography variant="body2" fontWeight="bold">
              {progress}%
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Начало проекта
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {project.start_date ? formatDate(project.start_date) : 'Не указано'}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="text.secondary" align="right">
                Завершение проекта
              </Typography>
              <Typography variant="body1" fontWeight="medium" align="right">
                {project.end_date ? formatDate(project.end_date) : 'Не указано'}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Информация
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <FlagIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Приоритет
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {project.priority === 'high' ? 'Высокий' : 
                       project.priority === 'medium' ? 'Средний' : 'Низкий'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Ответственный
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {project.manager_name || 'Не назначен'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Дата создания
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatDate(project.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Последнее обновление
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatDate(project.updated_at)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Card>
        
        <Card sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Статистика
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <Paper sx={{ 
                p: 2, 
                textAlign: 'center',
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                borderRadius: 2
              }}>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {project.open_defects_count || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Открытых дефектов
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={6}>
              <Paper sx={{ 
                p: 2, 
                textAlign: 'center',
                bgcolor: alpha(theme.palette.success.main, 0.1),
                borderRadius: 2
              }}>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {project.closed_defects_count || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Решенных дефектов
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Card>
      </Grid>
    </Grid>
  );
};

// Заглушки для других вкладок
const ProjectDefects = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h6">Список дефектов проекта</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
      Здесь будет отображаться список дефектов, связанных с этим проектом.
    </Typography>
  </Box>
);

const ProjectAttachments = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h6">Вложения проекта</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
      Здесь будут отображаться файлы, связанные с этим проектом.
    </Typography>
  </Box>
);

const ProjectComments = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h6">Комментарии</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
      Здесь будут отображаться комментарии к проекту.
    </Typography>
  </Box>
);

// Основной компонент
const ProjectDetails = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentProject, loading, error } = useSelector((state) => state.projects);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Запрос данных проекта при загрузке
  useEffect(() => {
    dispatch(fetchProjectById(id));
    
    return () => {
      dispatch(resetCurrentProject());
    };
  }, [dispatch, id]);
  
  // Обработчик изменения вкладки
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Обработчик удаления проекта
  const handleDeleteProject = () => {
    dispatch(deleteProject(id))
      .unwrap()
      .then(() => {
        navigate('/projects');
      })
      .catch((error) => {
        console.error('Ошибка при удалении проекта:', error);
      });
  };
  
  if (loading && !currentProject) {
    return <LoadingScreen />;
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card sx={{ 
            p: 3, 
            borderRadius: 3,
            borderLeft: `4px solid ${theme.palette.error.main}`,
            bgcolor: alpha(theme.palette.error.main, 0.1)
          }}>
            <Typography variant="h6" color="error.main" gutterBottom>
              Ошибка при загрузке проекта
            </Typography>
            <Typography>{error}</Typography>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<BackIcon />}
              onClick={() => navigate('/projects')}
              sx={{ mt: 2 }}
            >
              Вернуться к списку проектов
            </Button>
          </Card>
        </motion.div>
      </Box>
    );
  }
  
  if (!currentProject) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Проект не найден
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<BackIcon />}
          onClick={() => navigate('/projects')}
          sx={{ mt: 2 }}
        >
          Вернуться к списку проектов
        </Button>
      </Box>
    );
  }
  
  const statusInfo = getStatusInfo(currentProject.status);
  
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Верхняя панель с заголовком и действиями */}
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          mb: 3,
          gap: 2
        }}>
          <Box>
            <Button
              component={Link}
              to="/projects"
              startIcon={<BackIcon />}
              sx={{ mb: 1 }}
            >
              Назад к проектам
            </Button>
            
            <Typography variant="h4" component="h1" fontWeight="bold">
              {currentProject.name}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Chip 
                label={statusInfo.label} 
                color={statusInfo.color} 
                sx={{ mr: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Проект #{currentProject.id}
              </Typography>
            </Box>
          </Box>
          
          <Box>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/projects/${id}/edit`)}
              sx={{ mr: 1 }}
            >
              Редактировать
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => handleDeleteProject()}
            >
              Удалить
            </Button>
          </Box>
        </Box>
      </motion.div>
      
      {/* Вкладки проекта */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.9rem',
              minWidth: 100
            }
          }}
        >
          <Tab icon={<DashboardIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Обзор" />
          <Tab icon={<TaskIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Дефекты" />
          <Tab icon={<AttachmentIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Вложения" />
          <Tab icon={<CommentIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Комментарии" />
        </Tabs>
      </Box>
      
      {/* Содержимое вкладок */}
      <Box sx={{ mt: 2 }}>
        {tabValue === 0 && <ProjectOverview project={currentProject} />}
        {tabValue === 1 && <ProjectDefects />}
        {tabValue === 2 && <ProjectAttachments />}
        {tabValue === 3 && <ProjectComments />}
      </Box>
    </Box>
  );
};

export default ProjectDetails;