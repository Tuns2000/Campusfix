import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
  Divider,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';

import {
  fetchUserById,
  createUser,
  updateUser,
  resetSuccess,
  resetCurrentUser
} from '../../lib/slices/usersSlice';

const UserForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  
  const { currentUser, loading, error, success } = useSelector(state => state.users);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'observer',
    phone: '',
    position: '',
    department: ''
  });
  
  // Состояние для отображения пароля
  const [showPassword, setShowPassword] = useState(false);
  
  // Состояние для ошибок валидации
  const [validationErrors, setValidationErrors] = useState({});
  
  // Состояние для уведомлений
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Загрузка данных пользователя при редактировании
  useEffect(() => {
    if (isEditMode) {
      dispatch(fetchUserById(id));
    } else {
      dispatch(resetCurrentUser());
    }
    
    return () => {
      dispatch(resetCurrentUser());
    };
  }, [dispatch, id, isEditMode]);
  
  // Заполнение формы данными пользователя
  useEffect(() => {
    if (isEditMode && currentUser) {
      setFormData({
        email: currentUser.email || '',
        password: '', // Пароль не загружаем из соображений безопасности
        first_name: currentUser.first_name || '',
        last_name: currentUser.last_name || '',
        role: currentUser.role || 'observer',
        phone: currentUser.phone || '',
        position: currentUser.position || '',
        department: currentUser.department || ''
      });
    }
  }, [currentUser, isEditMode]);
  
  // Обработка успешного создания/обновления
  useEffect(() => {
    if (success) {
      setSnackbar({
        open: true,
        message: isEditMode
          ? 'Пользователь успешно обновлен'
          : 'Пользователь успешно создан',
        severity: 'success'
      });
      
      // Перенаправление на список пользователей после создания
      if (!isEditMode) {
        setTimeout(() => {
          navigate('/users');
        }, 1000);
      }
      
      dispatch(resetSuccess());
    }
  }, [success, dispatch, navigate, isEditMode]);
  
  // Обработка ошибок
  useEffect(() => {
    if (error) {
      setSnackbar({
        open: true,
        message: error,
        severity: 'error'
      });
    }
  }, [error]);
  
  // Обработчики изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Сброс ошибки валидации при изменении поля
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Переключение отображения пароля
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Валидация формы
  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.email) {
      errors.email = 'Email обязателен';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Некорректный формат email';
    }
    
    if (!isEditMode && !formData.password) {
      errors.password = 'Пароль обязателен';
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Пароль должен быть не менее 6 символов';
    }
    
    if (!formData.role) {
      errors.role = 'Роль обязательна';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Обработчик отправки формы
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Создаем объект с данными, исключая пустой пароль при редактировании
    const userData = { ...formData };
    if (isEditMode && !userData.password) {
      delete userData.password;
    }
    
    if (isEditMode) {
      dispatch(updateUser({ id, userData }));
    } else {
      dispatch(createUser(userData));
    }
  };
  
  // Обработчик закрытия уведомления
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Возврат к списку пользователей
  const handleBack = () => {
    navigate('/users');
  };
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {isEditMode ? 'Редактирование пользователя' : 'Новый пользователь'}
        </Typography>
      </Box>
      
      <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Основная информация
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={!!validationErrors.email}
                helperText={validationErrors.email}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={isEditMode ? "Новый пароль" : "Пароль"}
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                error={!!validationErrors.password}
                helperText={validationErrors.password || (isEditMode ? 'Оставьте пустым, чтобы не менять' : '')}
                required={!isEditMode}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Имя"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Фамилия"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth error={!!validationErrors.role}>
                <InputLabel id="role-label">Роль</InputLabel>
                <Select
                  labelId="role-label"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  label="Роль"
                  required
                >
                  <MenuItem value="admin">Администратор</MenuItem>
                  <MenuItem value="manager">Менеджер</MenuItem>
                  <MenuItem value="engineer">Инженер</MenuItem>
                  <MenuItem value="observer">Наблюдатель</MenuItem>
                </Select>
                {validationErrors.role && (
                  <Typography variant="caption" color="error">
                    {validationErrors.role}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Дополнительная информация
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Телефон"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Должность"
                name="position"
                value={formData.position}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Отдел"
                name="department"
                value={formData.department}
                onChange={handleChange}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              sx={{ mr: 2 }}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={loading}
            >
              {isEditMode ? 'Сохранить' : 'Создать'}
            </Button>
          </Box>
        </Box>
      </Card>
      
      {/* Уведомления */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserForm;