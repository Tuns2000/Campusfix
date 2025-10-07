import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Typography,
  TextField,
  Avatar,
  Divider,
  IconButton,
  Tab,
  Tabs,
  Alert,
  Snackbar,
  CircularProgress,
  Paper,
  useTheme,
  alpha,
  Chip  // Добавляем импорт Chip
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { 
  fetchProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  resetUpdateStatus,
  resetPasswordChangeStatus
} from '../../lib/slices/profileSlice';

// Компонент табов
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ProfilePage = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { profile, loading, error, updateSuccess, passwordChangeSuccess } = useSelector(state => state.profile);
  
  // Состояние для табов
  const [tabValue, setTabValue] = useState(0);
  
  // Состояние для редактирования профиля
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    position: '',
    department: ''
  });
  
  // Состояние для смены пароля
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Состояние для уведомлений
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Состояние валидации формы пароля
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Загрузка профиля при монтировании
  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);
  
  // Обновление полей формы при получении данных профиля
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        position: profile.position || '',
        department: profile.department || ''
      });
      
      // Сразу включаем режим редактирования, чтобы пользователь видел свои данные
      // Если вы хотите, чтобы форма была только для просмотра изначально, 
      // удалите следующую строку
      // setIsEditing(true);
    }
  }, [profile]);
  
  // Обработка успешного обновления профиля
  useEffect(() => {
    if (updateSuccess) {
      setSnackbar({
        open: true,
        message: 'Профиль успешно обновлен',
        severity: 'success'
      });
      setIsEditing(false);
      dispatch(resetUpdateStatus());
    }
  }, [updateSuccess, dispatch]);
  
  // Обработка успешной смены пароля
  useEffect(() => {
    if (passwordChangeSuccess) {
      setSnackbar({
        open: true,
        message: 'Пароль успешно изменен',
        severity: 'success'
      });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      dispatch(resetPasswordChangeStatus());
    }
  }, [passwordChangeSuccess, dispatch]);
  
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

  // Обработчик изменения табов
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Обработчик изменения полей формы
  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  // Обработчик изменения полей формы пароля
  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
    
    // Сброс ошибок при вводе
    setPasswordErrors({
      ...passwordErrors,
      [e.target.name]: ''
    });
  };
  
  // Обработчик сохранения профиля
  const handleSaveProfile = () => {
    dispatch(updateProfile(formData));
  };
  
  // Валидация формы смены пароля
  const validatePasswordForm = () => {
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    let isValid = true;
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Введите текущий пароль';
      isValid = false;
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'Введите новый пароль';
      isValid = false;
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Пароль должен быть не менее 6 символов';
      isValid = false;
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Подтвердите новый пароль';
      isValid = false;
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Пароли не совпадают';
      isValid = false;
    }
    
    setPasswordErrors(errors);
    return isValid;
  };
  
  // Обработчик смены пароля
  const handleChangePassword = () => {
    if (validatePasswordForm()) {
      dispatch(changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }));
    }
  };
  
  // Обработчик загрузки аватара
  const handleAvatarUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('avatar', file);
      
      dispatch(uploadAvatar(formData));
    }
  };
  
  // Закрытие уведомления
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading && !profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" sx={{ mb: 4 }}>
        Профиль
      </Typography>
      
      <Grid container spacing={4}>
        {/* Карточка с аватаром и основной информацией */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative', mb: 2 }}>
                <Avatar
                  src={profile?.avatar}
                  alt={`${profile?.first_name || ''} ${profile?.last_name || ''}`}
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    bgcolor: theme.palette.primary.main,
                    boxShadow: 3
                  }}
                >
                  {profile?.first_name ? profile.first_name.charAt(0) : 'U'}
                </Avatar>
                <label htmlFor="avatar-upload">
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                  <IconButton
                    component="span"
                    sx={{
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': { bgcolor: 'background.paper' }
                    }}
                  >
                    <CameraIcon fontSize="small" />
                  </IconButton>
                </label>
              </Box>
              
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {profile?.first_name} {profile?.last_name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {profile?.email}
              </Typography>
              
              <Chip
                label={profile?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                color={profile?.role === 'admin' ? 'primary' : 'default'}
                size="small"
                sx={{ mb: 2 }}
              />
              
              <Divider sx={{ width: '100%', my: 2 }} />
              
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Должность
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {profile?.position || 'Не указана'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                  Отдел
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {profile?.department || 'Не указан'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                  Телефон
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {profile?.phone || 'Не указан'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                  Дата регистрации
                </Typography>
                <Typography variant="body1">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ru-RU') : '-'}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
        
        {/* Вкладки для управления профилем */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab icon={<PersonIcon />} label="Личные данные" />
                <Tab icon={<LockIcon />} label="Безопасность" />
              </Tabs>
            </Box>
            
            {/* Вкладка с личными данными */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6" fontWeight="medium">
                    Личная информация
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={isEditing ? <SaveIcon /> : <EditIcon />}
                    onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                    disabled={loading}
                  >
                    {isEditing ? 'Сохранить' : 'Редактировать'}
                  </Button>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Имя"
                      name="first_name"
                      value={formData.first_name}  // Должно точно соответствовать ключу в объекте formData
                      onChange={handleFormChange}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Фамилия"
                      name="last_name"
                      value={formData.last_name}  // Должно точно соответствовать ключу в объекте formData
                      onChange={handleFormChange}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Телефон"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Должность"
                      name="position"
                      value={formData.position}
                      onChange={handleFormChange}
                      disabled={!isEditing}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Отдел"
                      name="department"
                      value={formData.department}
                      onChange={handleFormChange}
                      disabled={!isEditing}
                    />
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
            
            {/* Вкладка с безопасностью */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight="medium" gutterBottom>
                  Изменение пароля
                </Typography>
                
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    mt: 2, 
                    bgcolor: alpha(theme.palette.primary.light, 0.1),
                    borderRadius: 2
                  }}
                >
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Текущий пароль"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        error={!!passwordErrors.currentPassword}
                        helperText={passwordErrors.currentPassword}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Новый пароль"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        error={!!passwordErrors.newPassword}
                        helperText={passwordErrors.newPassword}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Подтверждение пароля"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        error={!!passwordErrors.confirmPassword}
                        helperText={passwordErrors.confirmPassword}
                      />
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleChangePassword}
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Изменить пароль'}
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            </TabPanel>
          </Card>
        </Grid>
      </Grid>
      
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

export default ProfilePage;