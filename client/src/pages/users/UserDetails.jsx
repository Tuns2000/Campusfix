import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Typography,
  Divider,
  Avatar,
  IconButton,
  Chip,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  BusinessCenter as BusinessCenterIcon,
  Event as EventIcon,
  VerifiedUser as VerifiedUserIcon
} from '@mui/icons-material';

import { fetchUserById, deleteUser } from '../../lib/slices/usersSlice';

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();

  const { currentUser: user, loading, error } = useSelector(state => state.users);
  const { user: authUser } = useSelector(state => state.auth);

  // Загрузка данных пользователя при монтировании
  useEffect(() => {
    dispatch(fetchUserById(id));
  }, [dispatch, id]);

  // Обработчики действий
  const handleBack = () => {
    navigate('/users');
  };

  const handleEdit = () => {
    navigate(`/users/${id}/edit`);
  };

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      dispatch(deleteUser(id)).then(() => {
        navigate('/users');
      });
    }
  };

  // Получение информации о роли
  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Администратор', color: 'error', icon: <VerifiedUserIcon /> };
      case 'manager':
        return { label: 'Менеджер', color: 'warning', icon: <BusinessCenterIcon /> };
      case 'engineer':
        return { label: 'Инженер', color: 'info', icon: <WorkIcon /> };
      case 'observer':
        return { label: 'Наблюдатель', color: 'default', icon: <VerifiedUserIcon /> };
      default:
        return { label: role, color: 'default', icon: <VerifiedUserIcon /> };
    }
  };

  // Создание инициалов для аватара
  const getInitials = (firstName, lastName) => {
    let initials = '';
    if (firstName) initials += firstName.charAt(0).toUpperCase();
    if (lastName) initials += lastName.charAt(0).toUpperCase();
    return initials || '?';
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" variant="h6">
            {error}
          </Typography>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={handleBack}>
            Вернуться к списку пользователей
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6">Пользователь не найден</Typography>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={handleBack}>
            Вернуться к списку пользователей
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Заголовок и кнопки */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Информация о пользователе
          </Typography>
        </Box>
        
        {authUser && authUser.role === 'admin' && authUser.id !== user.id && (
          <Box>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEdit}
              sx={{ mr: 2 }}
            >
              Редактировать
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              Удалить
            </Button>
          </Box>
        )}
      </Box>

      <Grid container spacing={4}>
        {/* Основная информация о пользователе */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 4, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar
                src={user.avatar}
                sx={{
                  width: 120,
                  height: 120,
                  bgcolor: theme.palette.primary.main,
                  fontSize: '3rem',
                  mb: 2
                }}
              >
                {getInitials(user.first_name, user.last_name)}
              </Avatar>
              <Typography variant="h5" fontWeight="bold" align="center">
                {user.first_name || user.last_name
                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                  : 'Пользователь'}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                {user.email}
              </Typography>
              <Chip
                label={getRoleInfo(user.role).label}
                color={getRoleInfo(user.role).color}
                icon={getRoleInfo(user.role).icon}
                sx={{ mt: 1 }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <List>
              {user.position && (
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <WorkIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Должность"
                    secondary={user.position}
                    primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  />
                </ListItem>
              )}

              {user.department && (
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <BusinessCenterIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Отдел"
                    secondary={user.department}
                    primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  />
                </ListItem>
              )}

              {user.phone && (
                <ListItem disableGutters>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PhoneIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Телефон"
                    secondary={user.phone}
                    primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  />
                </ListItem>
              )}

              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <EmailIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Email"
                  secondary={user.email}
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                />
              </ListItem>

              <ListItem disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <EventIcon color="primary" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Дата регистрации"
                  secondary={formatDate(user.created_at)}
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                />
              </ListItem>
            </List>
          </Card>
        </Grid>

        {/* Активность пользователя и статистика */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Активность пользователя
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {/* Здесь можно добавить статистику по пользователю, например: */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: theme => theme.palette.grey[50],
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        0
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Создано дефектов
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: theme => theme.palette.grey[50],
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        0
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Назначено дефектов
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: theme => theme.palette.grey[50],
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        0
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Комментариев
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 3, fontStyle: 'italic' }}>
                  Здесь будет отображаться информация о деятельности пользователя в системе.
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default UserDetails;