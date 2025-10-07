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
  Divider,
  Avatar,
  TextField,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemIcon,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha
} from '@mui/material';
import { 
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  ArrowBack as BackIcon,
  BugReport as BugIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  Flag as FlagIcon,
  Send as SendIcon,
  AttachFile as AttachmentIcon,
  Comment as CommentIcon,
  InsertPhoto as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as TextIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { 
  fetchDefectById, 
  resetCurrentDefect, 
  deleteDefect, 
  addComment,  // Заменено с addDefectComment на addComment
  updateDefect
} from '../../lib/slices/defectsSlice';
import LoadingScreen from '../../components/common/LoadingScreen';

// Форматирование даты
const formatDate = (dateString) => {
  if (!dateString) return 'Дата не указана';
  
  // Преобразуем в объект Date
  const date = new Date(dateString);
  
  // Проверяем, что дата валидна
  if (isNaN(date.getTime())) return 'Некорректная дата';
  
  // Форматируем дату для отображения
  return new Intl.DateTimeFormat('ru', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Форматирование времени
const formatDateTime = (dateString) => {
  if (!dateString) return 'Дата не указана';
  
  try {
    const date = new Date(dateString);
    
    // Проверяем, что дата валидна
    if (isNaN(date.getTime())) return 'Некорректная дата';
    
    return `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) {
    console.error('Ошибка форматирования даты:', dateString, error);
    return 'Ошибка даты';
  }
};

// Получение иконки для типа файла
const getFileIcon = (filename) => {
  if (!filename) return <AttachmentIcon />;
  
  const extension = filename.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
    return <ImageIcon />;
  } else if (['pdf'].includes(extension)) {
    return <PdfIcon />;
  } else if (['txt', 'doc', 'docx', 'rtf'].includes(extension)) {
    return <TextIcon />;
  }
  
  return <AttachmentIcon />;
};

// Получение статуса на русском и цвета
const getStatusInfo = (status) => {
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

// Получение приоритета на русском и цвета
const getPriorityInfo = (priority) => {
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

// Компонент вложений
const AttachmentsTab = ({ attachments = [] }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ p: 3 }}>
      {attachments.length > 0 ? (
        <List>
          {attachments.map((attachment, index) => (
            <Paper
              key={index}
              elevation={1}
              sx={{
                mb: 2,
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <ListItem
                button
                component="a"
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ListItemIcon>
                  {getFileIcon(attachment.filename)}
                </ListItemIcon>
                <ListItemText
                  primary={attachment.filename}
                  secondary={`Добавлено: ${formatDateTime(attachment.uploaded_at)}`}
                />
              </ListItem>
            </Paper>
          ))}
        </List>
      ) : (
        <Typography color="text.secondary" align="center">
          Нет прикрепленных файлов
        </Typography>
      )}
    </Box>
  );
};

// Компонент комментариев
const CommentsTab = ({ comments = [], defectId, onAddComment }) => {
  const theme = useTheme();
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const { user } = useSelector((state) => state.auth);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment({
        defect_id: defectId,
        text: commentText
      });
      setCommentText('');
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Введите комментарий..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          variant="outlined"
          sx={{ mb: 2 }}
          error={!!commentError}
          helperText={commentError}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!commentText.trim()}
            startIcon={<SendIcon />}
          >
            Отправить
          </Button>
        </Box>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {comments.length > 0 ? (
        <List>
          {comments.map((comment, index) => (
            <Card
              key={index}
              elevation={1}
              sx={{
                mb: 2,
                p: 2,
                borderRadius: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <ListItemAvatar>
                  <Avatar
                    src={comment.user?.avatar}
                    alt={comment.user?.name}
                    sx={{ bgcolor: theme.palette.primary.main }}
                  >
                    {comment.user?.name ? comment.user.name.charAt(0) : 'П'}
                  </Avatar>
                </ListItemAvatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {comment.user?.name || 'Пользователь'}
                      {comment.user?.role && 
                        <Chip size="small" label={comment.user.role} sx={{ml: 1, fontSize: '0.7rem'}} />
                      }
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(comment.createdAt || comment.created_at)}
                    </Typography>
                  </Box>
                  
                  {/* Добавьте или исправьте следующий блок текста комментария */}
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      mt: 1, 
                      whiteSpace: 'pre-wrap',
                      color: 'text.primary',
                      fontWeight: 'normal'
                    }}
                  >
                    {comment.text}
                  </Typography>
                </Box>
              </Box>
            </Card>
          ))}
        </List>
      ) : (
        <Typography color="text.secondary" align="center">
          Нет комментариев
        </Typography>
      )}
    </Box>
  );
};

// Основной компонент деталей дефекта
const DefectDetails = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentDefect, loading, error } = useSelector((state) => state.defects);
  const [tabValue, setTabValue] = useState(0);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Загрузка данных при монтировании
  useEffect(() => {
    dispatch(fetchDefectById(id));
    
    return () => {
      dispatch(resetCurrentDefect());
    };
  }, [dispatch, id]);
  
  // Установка текущего статуса при загрузке дефекта
  useEffect(() => {
    if (currentDefect) {
      setNewStatus(currentDefect.status);
    }
  }, [currentDefect]);
  
  // Обработчик изменения вкладки
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Обработчик открытия диалога изменения статуса
  const handleStatusDialogOpen = () => {
    setStatusChangeOpen(true);
  };
  
  // Обработчик закрытия диалога изменения статуса
  const handleStatusDialogClose = () => {
    setStatusChangeOpen(false);
    setNewStatus(currentDefect.status);
  };
  
  // Обработчик изменения статуса
  const handleStatusChange = (e) => {
    setNewStatus(e.target.value);
  };
  
  // Обработчик сохранения статуса
  const handleStatusSave = () => {
    dispatch(updateDefect({
      id,
      defectData: { status: newStatus }
    }))
      .unwrap()
      .then(() => {
        setStatusChangeOpen(false);
      })
      .catch((error) => {
        console.error('Ошибка при изменении статуса:', error);
      });
  };
  
  // Обработчик удаления дефекта
  const handleDeleteDefect = () => {
    setDeleteDialogOpen(true);
  };
  
  // Обработчик подтверждения удаления
  const handleDeleteConfirm = () => {
    dispatch(deleteDefect(id))
      .unwrap()
      .then(() => {
        navigate('/defects');
      })
      .catch((error) => {
        console.error('Ошибка при удалении дефекта:', error);
        setDeleteDialogOpen(false);
      });
  };
  
  // Обработчик отмены удаления
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };
  
  // Обработчик добавления комментария
  const handleAddComment = (commentData) => {
    // Для совместимости с API-запросом создадим нужную структуру данных
    dispatch(addComment({
      defectId: id,
      text: commentData.text
    }));
  };
  
  if (loading && !currentDefect) {
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
              Ошибка при загрузке дефекта
            </Typography>
            <Typography>{error}</Typography>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<BackIcon />}
              onClick={() => navigate('/defects')}
              sx={{ mt: 2 }}
            >
              Вернуться к списку дефектов
            </Button>
          </Card>
        </motion.div>
      </Box>
    );
  }
  
  if (!currentDefect) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Дефект не найден
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<BackIcon />}
          onClick={() => navigate('/defects')}
          sx={{ mt: 2 }}
        >
          Вернуться к списку дефектов
        </Button>
      </Box>
    );
  }
  
  const statusInfo = getStatusInfo(currentDefect.status);
  const priorityInfo = getPriorityInfo(currentDefect.priority);
  
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
              to="/defects"
              startIcon={<BackIcon />}
              sx={{ mb: 1 }}
            >
              Назад к дефектам
            </Button>
            
            <Typography variant="h4" component="h1" fontWeight="bold">
              {currentDefect.title}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Chip 
                label={statusInfo.label} 
                color={statusInfo.color} 
                sx={{ mr: 1 }}
                onClick={handleStatusDialogOpen}
              />
              <Chip 
                label={priorityInfo.label} 
                color={priorityInfo.color} 
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Дефект #{currentDefect.id}
              </Typography>
            </Box>
          </Box>
          
          <Box>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/defects/${id}/edit`)}
              sx={{ mr: 1 }}
            >
              Редактировать
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteDefect}
            >
              Удалить
            </Button>
          </Box>
        </Box>
      </motion.div>
      
      {/* Вкладки дефекта */}
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
          <Tab icon={<BugIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Описание" />
          <Tab icon={<AttachmentIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Вложения" />
          <Tab icon={<CommentIcon sx={{ fontSize: '1.1rem' }} />} iconPosition="start" label="Комментарии" />
        </Tabs>
      </Box>
      
      {/* Содержимое вкладок */}
      <Grid container spacing={3}>
        {tabValue === 0 && (
          <Grid container spacing={3} sx={{ p: 2 }}>
            <Grid item xs={12} md={8}>
              <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Описание проблемы
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {currentDefect.description}
                </Typography>
              </Card>
              
              {currentDefect.steps_to_reproduce && (
                <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Шаги воспроизведения
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {currentDefect.steps_to_reproduce}
                  </Typography>
                </Card>
              )}
              
              {currentDefect.expected_result && (
                <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Ожидаемый результат
                  </Typography>
                  <Typography variant="body1">
                    {currentDefect.expected_result}
                  </Typography>
                </Card>
              )}
              
              {currentDefect.actual_result && (
                <Card sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Фактический результат
                  </Typography>
                  <Typography variant="body1">
                    {currentDefect.actual_result}
                  </Typography>
                </Card>
              )}
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
                            Статус
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {statusInfo.label}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <FlagIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Приоритет
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {priorityInfo.label}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <FlagIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Проект
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {currentDefect.project_name || 'Не указан'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Автор
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {currentDefect.reporter_name || 'Не указан'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Назначен
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {currentDefect.assigned_name || 'Не назначен'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Создан
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {formatDate(currentDefect.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Обновлен
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {formatDate(currentDefect.updated_at)}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </Card>
            </Grid>
          </Grid>
        )}
        
        {tabValue === 1 && (
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <AttachmentsTab attachments={currentDefect.attachments || []} />
            </Card>
          </Grid>
        )}
        
        {tabValue === 2 && (
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <CommentsTab 
                comments={currentDefect.comments || []} 
                defectId={currentDefect.id}
                onAddComment={(data) => handleAddComment({ text: data.text })}
              />
            </Card>
          </Grid>
        )}
      </Grid>
      
      {/* Диалог изменения статуса */}
      <Dialog
        open={statusChangeOpen}
        onClose={handleStatusDialogClose}
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle>Изменение статуса дефекта</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, pt: 1 }}>
            <TextField
              select
              label="Статус"
              value={newStatus}
              onChange={handleStatusChange}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="new">Новый</option>
              <option value="in_progress">В работе</option>
              <option value="resolved">Решен</option>
              <option value="closed">Закрыт</option>
              <option value="reopened">Переоткрыт</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button variant="outlined" onClick={handleStatusDialogClose}>
            Отмена
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleStatusSave}
            startIcon={<SaveIcon />}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог подтверждения удаления */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы действительно хотите удалить этот дефект? Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            variant="outlined"
            onClick={handleDeleteCancel}
          >
            Отмена
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleDeleteConfirm}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DefectDetails;