import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  Card,
  IconButton,
  Alert,
  AlertTitle,
  Divider,
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ruLocale from 'date-fns/locale/ru';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { 
  fetchProjectById, 
  createProject,
  updateProject,
  resetCurrentProject,
  resetProjectMessages
} from '../../lib/slices/projectsSlice';
import LoadingScreen from '../../components/common/LoadingScreen';

const ProjectForm = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  const { currentProject, loading, error, createSuccess, updateSuccess } = useSelector((state) => state.projects);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planned',
    priority: 'medium',
    manager_id: '',
    start_date: null,
    end_date: null
  });
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  
  // Загрузка данных для редактирования
  useEffect(() => {
    if (isEditMode) {
      dispatch(fetchProjectById(id));
    } else {
      dispatch(resetCurrentProject());
    }
    
    return () => {
      dispatch(resetCurrentProject());
      dispatch(resetProjectMessages());
    };
  }, [dispatch, id, isEditMode]);
  
  // Заполнение формы данными проекта
  useEffect(() => {
    if (isEditMode && currentProject) {
      setFormData({
        name: currentProject.name || '',
        description: currentProject.description || '',
        status: currentProject.status || 'planned',
        priority: currentProject.priority || 'medium',
        manager_id: currentProject.manager_id || '',
        start_date: currentProject.start_date ? new Date(currentProject.start_date) : null,
        end_date: currentProject.end_date ? new Date(currentProject.end_date) : null
      });
    }
  }, [isEditMode, currentProject]);
  
  // Обработка успешного создания/обновления
  useEffect(() => {
    if (createSuccess) {
      setSuccessMessage('Проект успешно создан!');
      setTimeout(() => navigate('/projects'), 1500);
    }
    
    if (updateSuccess) {
      setSuccessMessage('Проект успешно обновлен!');
      setTimeout(() => navigate(`/projects/${id}`), 1500);
    }
  }, [createSuccess, updateSuccess, navigate, id]);
  
  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Сброс ошибки поля при изменении
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };
  
  // Обработчик изменения дат
  const handleDateChange = (name) => (newDate) => {
    setFormData({
      ...formData,
      [name]: newDate
    });
    
    // Сброс ошибки поля при изменении
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };
  
  // Валидация формы перед отправкой
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Название проекта обязательно';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Описание проекта обязательно';
    }
    
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      errors.end_date = 'Дата окончания не может быть раньше даты начала';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Обработчик отправки формы
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const projectData = {
        ...formData,
        start_date: formData.start_date ? formData.start_date.toISOString().split('T')[0] : null,
        end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null
      };
      
      // Добавляем логирование
      console.log('Отправка данных проекта на сервер:', projectData);
      
      if (isEditMode) {
        dispatch(updateProject({ id, projectData }));
      } else {
        dispatch(createProject(projectData));
      }
    }
  };
  
  // Загрузка данных проекта для редактирования
  if (isEditMode && loading && !currentProject) {
    return <LoadingScreen />;
  }
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ruLocale}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 4
          }}>
            <Box>
              <Button
                component={Link}
                to={isEditMode ? `/projects/${id}` : '/projects'}
                startIcon={<BackIcon />}
                sx={{ mb: 1 }}
              >
                {isEditMode ? 'Назад к проекту' : 'Назад к проектам'}
              </Button>
              
              <Typography variant="h4" component="h1" fontWeight="bold">
                {isEditMode ? 'Редактирование проекта' : 'Создание проекта'}
              </Typography>
            </Box>
          </Box>
        </motion.div>
        
        {/* Форма успешного создания/обновления */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert 
              severity="success"
              sx={{ 
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-message': { display: 'flex', alignItems: 'center' }
              }}
            >
              <AlertTitle>Успех</AlertTitle>
              {successMessage}
            </Alert>
          </motion.div>
        )}
        
        {/* Сообщение об ошибке */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert 
              severity="error"
              sx={{ 
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-message': { display: 'flex', alignItems: 'center' }
              }}
            >
              <AlertTitle>Ошибка</AlertTitle>
              {error}
            </Alert>
          </motion.div>
        )}
        
        {/* Форма проекта */}
        <Card 
          component="form" 
          onSubmit={handleSubmit}
          sx={{ 
            p: 3, 
            borderRadius: 3,
            boxShadow: theme.shadows[3]
          }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Название проекта"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
                error={Boolean(formErrors.name)}
                helperText={formErrors.name}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Описание проекта"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                required
                multiline
                rows={4}
                error={Boolean(formErrors.description)}
                helperText={formErrors.description}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Статус</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Статус"
                >
                  <MenuItem value="planned">Запланирован</MenuItem>
                  <MenuItem value="active">Активный</MenuItem>
                  <MenuItem value="in_progress">В работе</MenuItem>
                  <MenuItem value="pending">Приостановлен</MenuItem>
                  <MenuItem value="completed">Завершен</MenuItem>
                  <MenuItem value="cancelled">Отменен</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="priority-label">Приоритет</InputLabel>
                <Select
                  labelId="priority-label"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  label="Приоритет"
                >
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Дата начала"
                value={formData.start_date}
                onChange={handleDateChange('start_date')}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    fullWidth
                    error={Boolean(formErrors.start_date)}
                    helperText={formErrors.start_date}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Дата окончания"
                value={formData.end_date}
                onChange={handleDateChange('end_date')}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    fullWidth
                    error={Boolean(formErrors.end_date)}
                    helperText={formErrors.end_date}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  component={Link}
                  to={isEditMode ? `/projects/${id}` : '/projects'}
                  sx={{ mr: 2 }}
                  startIcon={<CloseIcon />}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  sx={{ 
                    px: 4,
                    py: 1,
                    backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`
                  }}
                >
                  {isEditMode ? 'Сохранить изменения' : 'Создать проект'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Card>
      </Box>
    </LocalizationProvider>
  );
};

export default ProjectForm;