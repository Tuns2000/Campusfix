import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
  Grid,
  Card,
  IconButton,
  FormHelperText,
  Chip,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useTheme,
  alpha
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  InsertPhoto as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as TextIcon
} from '@mui/icons-material';
import { 
  createDefect, 
  fetchDefectById, 
  updateDefect, 
  resetDefectMessages 
} from '../../lib/slices/defectsSlice';
import { fetchProjects } from '../../lib/slices/projectsSlice';
import LoadingScreen from '../../components/common/LoadingScreen';

// Получение иконки для типа файла
const getFileIcon = (filename) => {
  if (!filename) return <AttachFileIcon />;
  
  const extension = filename.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
    return <ImageIcon />;
  } else if (['pdf'].includes(extension)) {
    return <PdfIcon />;
  } else if (['txt', 'doc', 'docx', 'rtf'].includes(extension)) {
    return <TextIcon />;
  }
  
  return <AttachFileIcon />;
};

const DefectForm = () => {
  const theme = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentDefect, loading, error, createSuccess, updateSuccess } = useSelector((state) => state.defects);
  const { projects } = useSelector((state) => state.projects);
  const { user } = useSelector((state) => state.auth);
  
  const isEditMode = Boolean(id);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    steps_to_reproduce: '',
    expected_result: '',
    actual_result: '',
    status: 'new',
    priority: 'medium',
    project_id: '',
    assigned_to: '',
    reporter_id: user?.id || ''
  });
  
  // Состояние для загрузки файлов
  const [attachments, setAttachments] = useState([]);
  const [currentAttachments, setCurrentAttachments] = useState([]);
  const [removeAttachmentDialog, setRemoveAttachmentDialog] = useState({
    open: false,
    attachmentId: null
  });
  
  // Состояние ошибок валидации
  const [validationErrors, setValidationErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  
  // Загрузка данных для редактирования
  useEffect(() => {
    dispatch(fetchProjects());
    
    if (isEditMode) {
      dispatch(fetchDefectById(id));
    }
    
    return () => {
      dispatch(resetDefectMessages());
    };
  }, [dispatch, id, isEditMode]);
  
  // Заполнение формы данными для редактирования
  useEffect(() => {
    if (isEditMode && currentDefect) {
      setFormData({
        title: currentDefect.title || '',
        description: currentDefect.description || '',
        steps_to_reproduce: currentDefect.steps_to_reproduce || '',
        expected_result: currentDefect.expected_result || '',
        actual_result: currentDefect.actual_result || '',
        status: currentDefect.status || 'new',
        priority: currentDefect.priority || 'medium',
        project_id: currentDefect.project_id || '',
        assigned_to: currentDefect.assigned_to || '',
        reporter_id: currentDefect.reporter_id || user?.id || ''
      });
      
      setCurrentAttachments(currentDefect.attachments || []);
    }
  }, [isEditMode, currentDefect, user]);
  
  // Обработка успешного создания/редактирования
  useEffect(() => {
    if (createSuccess) {
      navigate('/defects');
    } else if (updateSuccess) {
      navigate(`/defects/${id}`);
    }
  }, [createSuccess, updateSuccess, id, navigate]);
  
  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Сбрасываем ошибку при изменении поля
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Обработчик загрузки файлов
  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };
  
  // Удаление загруженного файла
  const handleRemoveAttachment = (index) => {
    setAttachments(prev => {
      const updatedAttachments = [...prev];
      updatedAttachments.splice(index, 1);
      return updatedAttachments;
    });
  };
  
  // Открытие диалога удаления прикрепленного файла
  const handleOpenRemoveAttachmentDialog = (attachmentId) => {
    setRemoveAttachmentDialog({
      open: true,
      attachmentId
    });
  };
  
  // Закрытие диалога удаления прикрепленного файла
  const handleCloseRemoveAttachmentDialog = () => {
    setRemoveAttachmentDialog({
      open: false,
      attachmentId: null
    });
  };
  
  // Удаление прикрепленного файла
  const handleRemoveCurrentAttachment = () => {
    const { attachmentId } = removeAttachmentDialog;
    
    // В реальном приложении здесь должен быть API запрос для удаления файла
    // dispatch(deleteAttachment(attachmentId));
    
    setCurrentAttachments(prev => 
      prev.filter(attachment => attachment.id !== attachmentId)
    );
    
    handleCloseRemoveAttachmentDialog();
  };
  
  // Валидация формы
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Название дефекта обязательно';
    } else if (formData.title.trim().length < 5) {
      errors.title = 'Название должно содержать минимум 5 символов';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Описание дефекта обязательно';
    }
    
    if (!formData.project_id) {
      errors.project_id = 'Выберите проект';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Обработчик отправки формы
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    
    if (validateForm()) {
      if (isEditMode) {
        dispatch(updateDefect({ 
          id, 
          defectData: formData, 
          attachments 
        }));
      } else {
        dispatch(createDefect({ 
          defectData: formData, 
          attachments 
        }));
      }
    }
  };
  
  // Обработчик отмены
  const handleCancel = () => {
    if (isEditMode) {
      navigate(`/defects/${id}`);
    } else {
      navigate('/defects');
    }
  };
  
  if (loading && isEditMode && !currentDefect) {
    return <LoadingScreen />;
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Заголовок формы */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Button
            component={Link}
            to="/defects"
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 2 }}
          >
            Назад
          </Button>
          <Typography variant="h4" component="h1" fontWeight="bold">
            {isEditMode ? 'Редактирование дефекта' : 'Создание дефекта'}
          </Typography>
        </Box>
        
        {/* Сообщение об ошибке */}
        {error && (
          <Card 
            sx={{ 
              p: 2, 
              mb: 3, 
              borderRadius: 2, 
              borderLeft: `4px solid ${theme.palette.error.main}`,
              bgcolor: alpha(theme.palette.error.main, 0.1)
            }}
          >
            <Typography color="error">{error}</Typography>
          </Card>
        )}
        
        {/* Форма дефекта */}
        <Card sx={{ p: 3, borderRadius: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Основная информация */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Основная информация
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              {/* Название дефекта */}
              <Grid item xs={12}>
                <TextField
                  name="title"
                  label="Название дефекта"
                  fullWidth
                  required
                  value={formData.title}
                  onChange={handleChange}
                  error={!!validationErrors.title && submitted}
                  helperText={submitted && validationErrors.title}
                />
              </Grid>
              
              {/* Проект */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required error={!!validationErrors.project_id && submitted}>
                  <InputLabel>Проект</InputLabel>
                  <Select
                    name="project_id"
                    value={formData.project_id}
                    onChange={handleChange}
                    label="Проект"
                  >
                    <MenuItem value="">
                      <em>Выберите проект</em>
                    </MenuItem>
                    {projects.map(project => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {submitted && validationErrors.project_id && (
                    <FormHelperText>{validationErrors.project_id}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              {/* Приоритет */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Приоритет</InputLabel>
                  <Select
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
              
              {/* Статус */}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel>Статус</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label="Статус"
                  >
                    <MenuItem value="new">Новый</MenuItem>
                    <MenuItem value="in_progress">В работе</MenuItem>
                    <MenuItem value="resolved">Решен</MenuItem>
                    <MenuItem value="closed">Закрыт</MenuItem>
                    <MenuItem value="reopened">Переоткрыт</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Назначено */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Назначено</InputLabel>
                  <Select
                    name="assigned_to"
                    value={formData.assigned_to}
                    onChange={handleChange}
                    label="Назначено"
                  >
                    <MenuItem value="">Не назначено</MenuItem>
                    {/* В реальном приложении здесь будет список пользователей из API */}
                    <MenuItem value={user?.id}>Мне</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Автор дефекта */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required disabled>
                  <InputLabel>Автор дефекта</InputLabel>
                  <Select
                    name="reporter_id"
                    value={formData.reporter_id}
                    label="Автор дефекта"
                  >
                    <MenuItem value={user?.id}>{user?.name || 'Текущий пользователь'}</MenuItem>
                  </Select>
                  <FormHelperText>Автор дефекта задается автоматически</FormHelperText>
                </FormControl>
              </Grid>
              
              {/* Описание дефекта */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Детальное описание
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              {/* Описание */}
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Описание дефекта"
                  fullWidth
                  required
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  error={!!validationErrors.description && submitted}
                  helperText={submitted && validationErrors.description}
                />
              </Grid>
              
              {/* Шаги воспроизведения */}
              <Grid item xs={12}>
                <TextField
                  name="steps_to_reproduce"
                  label="Шаги воспроизведения"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="1. Открыть страницу...\n2. Нажать на кнопку...\n3. ..."
                  value={formData.steps_to_reproduce}
                  onChange={handleChange}
                />
              </Grid>
              
              {/* Ожидаемый результат */}
              <Grid item xs={12} md={6}>
                <TextField
                  name="expected_result"
                  label="Ожидаемый результат"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.expected_result}
                  onChange={handleChange}
                />
              </Grid>
              
              {/* Фактический результат */}
              <Grid item xs={12} md={6}>
                <TextField
                  name="actual_result"
                  label="Фактический результат"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.actual_result}
                  onChange={handleChange}
                />
              </Grid>
              
              {/* Вложения */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom fontWeight="medium">
                  Вложения
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {/* Загрузка файлов */}
                <Box sx={{ mb: 3 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AttachFileIcon />}
                  >
                    Добавить файлы
                    <input
                      type="file"
                      multiple
                      hidden
                      onChange={handleFileChange}
                    />
                  </Button>
                </Box>
                
                {/* Список новых файлов */}
                {attachments.length > 0 && (
                  <Paper sx={{ mb: 3, p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Новые файлы
                    </Typography>
                    <List dense>
                      {attachments.map((file, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            {getFileIcon(file.name)}
                          </ListItemIcon>
                          <ListItemText
                            primary={file.name}
                            secondary={`${(file.size / 1024).toFixed(1)} КБ`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              onClick={() => handleRemoveAttachment(index)}
                              size="small"
                            >
                              <CloseIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
                
                {/* Список существующих вложений */}
                {isEditMode && currentAttachments.length > 0 && (
                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Существующие вложения
                    </Typography>
                    <List dense>
                      {currentAttachments.map((attachment) => (
                        <ListItem 
                          key={attachment.id}
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
                            secondary={attachment.uploaded_at ? 
                              `Добавлено: ${new Date(attachment.uploaded_at).toLocaleString()}` : 
                              ''}
                          />
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              onClick={() => handleOpenRemoveAttachmentDialog(attachment.id)}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Grid>
              
              {/* Кнопки формы */}
              <Grid item xs={12} sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={handleCancel}
                  startIcon={<CloseIcon />}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  disabled={loading}
                  sx={{
                    backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`
                  }}
                >
                  {loading ? 'Сохранение...' : (isEditMode ? 'Сохранить изменения' : 'Создать дефект')}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Card>
        
        {/* Диалог удаления вложения */}
        <Dialog
          open={removeAttachmentDialog.open}
          onClose={handleCloseRemoveAttachmentDialog}
          PaperProps={{
            sx: { borderRadius: 3, p: 1 }
          }}
        >
          <DialogTitle>Удаление вложения</DialogTitle>
          <DialogContent>
            <Typography>
              Вы действительно хотите удалить это вложение? Это действие нельзя отменить.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button 
              variant="outlined"
              onClick={handleCloseRemoveAttachmentDialog}
            >
              Отмена
            </Button>
            <Button 
              variant="contained" 
              color="error"
              onClick={handleRemoveCurrentAttachment}
            >
              Удалить
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Box>
  );
};

export default DefectForm;