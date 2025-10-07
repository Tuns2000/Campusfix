import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box,
  Typography,
  Button,
  Card,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  BugReport as BugIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  Flag as FlagIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { fetchDefects, deleteDefect, resetDefectMessages, setFilters, setPage } from '../../lib/slices/defectsSlice';
import { fetchProjects } from '../../lib/slices/projectsSlice';
import LoadingScreen from '../../components/common/LoadingScreen';

// Форматирование даты
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

const DefectList = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { defects, loading, error, filters, pagination } = useSelector((state) => state.defects);
  const { projects } = useSelector((state) => state.projects);
  const { user } = useSelector((state) => state.auth);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDefectId, setSelectedDefectId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  
  // Загрузка данных при монтировании
  useEffect(() => {
    // Проверяем параметры URL для применения фильтров
    const searchParams = new URLSearchParams(location.search);
    const urlFilters = {};
    
    if (searchParams.has('status')) urlFilters.status = searchParams.get('status');
    if (searchParams.has('priority')) urlFilters.priority = searchParams.get('priority');
    if (searchParams.has('project_id')) urlFilters.project_id = searchParams.get('project_id');
    if (searchParams.has('assigned_to')) urlFilters.assigned_to = searchParams.get('assigned_to');
    
    // Применяем фильтры из URL
    if (Object.keys(urlFilters).length > 0) {
      dispatch(setFilters(urlFilters));
      setLocalFilters({...filters, ...urlFilters});
    }
    
    // Загружаем список дефектов с применением фильтров
    dispatch(fetchDefects({...filters, ...urlFilters}));
    
    // Загружаем список проектов для фильтрации
    dispatch(fetchProjects());
  }, [dispatch, location.search]);
  
  // Отслеживаем изменения фильтров
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);
  
  // Обработчики меню
  const handleOpenMenu = (event, defectId) => {
    setAnchorEl(event.currentTarget);
    setSelectedDefectId(defectId);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedDefectId(null);
  };
  
  const handleEditDefect = () => {
    navigate(`/defects/${selectedDefectId}/edit`);
    handleCloseMenu();
  };
  
  const handleDeleteDialogOpen = () => {
    setDeleteDialogOpen(true);
    handleCloseMenu();
  };
  
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
  };
  
  const handleDeleteConfirm = () => {
    dispatch(deleteDefect(selectedDefectId))
      .unwrap()
      .then(() => {
        // Успешное удаление
      })
      .catch((error) => {
        console.error('Ошибка при удалении дефекта:', error);
      });
    setDeleteDialogOpen(false);
  };
  
  // Обработчик изменения фильтров
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setLocalFilters({
      ...localFilters,
      [name]: value === 'all' ? null : value
    });
  };
  
  // Применение фильтров
  const applyFilters = () => {
    dispatch(setFilters(localFilters));
    
    // Обновляем URL для возможности поделиться ссылкой с фильтрами
    const searchParams = new URLSearchParams();
    Object.entries(localFilters).forEach(([key, value]) => {
      if (value) searchParams.append(key, value);
    });
    navigate({
      pathname: location.pathname,
      search: searchParams.toString()
    });
    
    // Загружаем данные с новыми фильтрами
    dispatch(fetchDefects(localFilters));
  };
  
  // Сброс фильтров
  const resetFilters = () => {
    const clearedFilters = {
      status: null,
      priority: null,
      project_id: null,
      assigned_to: null
    };
    setLocalFilters(clearedFilters);
    dispatch(setFilters(clearedFilters));
    navigate(location.pathname);
    dispatch(fetchDefects(clearedFilters));
  };
  
  // Обработчик поиска
  const handleSearch = () => {
    dispatch(fetchDefects({ 
      ...filters, 
      search: searchTerm 
    }));
  };
  
  // Обработчик изменения страницы
  const handlePageChange = (event, newPage) => {
    dispatch(setPage(newPage));
    dispatch(fetchDefects({ ...filters, page: newPage }));
  };
  
  // Фильтрация дефектов по поисковому запросу
  const filteredDefects = searchTerm 
    ? defects.filter(defect => 
        defect.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        defect.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : defects;
  
  if (loading && defects.length === 0) {
    return <LoadingScreen />;
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок и кнопка создания */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Дефекты
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/defects/new')}
          sx={{ 
            px: 3, 
            py: 1, 
            borderRadius: 2,
            backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`
          }}
        >
          Создать дефект
        </Button>
      </Box>
      
      {/* Поиск и фильтры */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Поиск дефектов..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleSearch}>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
              sx: { borderRadius: 2, bgcolor: 'background.paper' }
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            sx={{ borderRadius: 2, mr: 1 }}
          >
            Фильтры
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              dispatch(fetchDefects(filters));
            }}
            sx={{ borderRadius: 2 }}
          >
            Обновить
          </Button>
        </Grid>
      </Grid>
      
      {/* Панель фильтров */}
      {showFilters && (
        <Card sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Фильтры
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Статус</InputLabel>
                <Select
                  name="status"
                  value={localFilters.status || 'all'}
                  onChange={handleFilterChange}
                  label="Статус"
                >
                  <MenuItem value="all">Все статусы</MenuItem>
                  <MenuItem value="new">Новый</MenuItem>
                  <MenuItem value="in_progress">В работе</MenuItem>
                  <MenuItem value="resolved">Решен</MenuItem>
                  <MenuItem value="closed">Закрыт</MenuItem>
                  <MenuItem value="reopened">Переоткрыт</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Приоритет</InputLabel>
                <Select
                  name="priority"
                  value={localFilters.priority || 'all'}
                  onChange={handleFilterChange}
                  label="Приоритет"
                >
                  <MenuItem value="all">Все приоритеты</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="low">Низкий</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Проект</InputLabel>
                <Select
                  name="project_id"
                  value={localFilters.project_id || 'all'}
                  onChange={handleFilterChange}
                  label="Проект"
                >
                  <MenuItem value="all">Все проекты</MenuItem>
                  {projects.map(project => (
                    <MenuItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel>Назначено</InputLabel>
                <Select
                  name="assigned_to"
                  value={localFilters.assigned_to || 'all'}
                  onChange={handleFilterChange}
                  label="Назначено"
                >
                  <MenuItem value="all">Все</MenuItem>
                  <MenuItem value={user.id.toString()}>Мне</MenuItem>
                  <MenuItem value="null">Не назначено</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={resetFilters}
                sx={{ mr: 2 }}
              >
                Сбросить
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={applyFilters}
              >
                Применить
              </Button>
            </Grid>
          </Grid>
        </Card>
      )}
      
      {/* Сообщение об ошибке */}
      {error && (
        <Box sx={{ mb: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card sx={{ 
              p: 2, 
              borderRadius: 2,
              borderLeft: `4px solid ${theme.palette.error.main}`,
              bgcolor: alpha(theme.palette.error.main, 0.1)
            }}>
              <Typography color="error">{error}</Typography>
            </Card>
          </motion.div>
        </Box>
      )}
      
      {/* Список дефектов */}
      {filteredDefects.length > 0 ? (
        <Grid container spacing={3}>
          {filteredDefects.map((defect, index) => {
            const statusInfo = getStatusInfo(defect.status);
            const priorityInfo = getPriorityInfo(defect.priority);
            
            return (
              <Grid item xs={12} key={defect.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card 
                    sx={{ 
                      borderRadius: 2,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[4]
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: {xs: 'column', sm: 'row'}, p: 0 }}>
                      {/* Левая колонка с иконкой */}
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          justifyContent: 'center', 
                          bgcolor: alpha(theme.palette[priorityInfo.color].main, 0.1),
                          px: {xs: 2, sm: 3},
                          py: {xs: 2, sm: 0},
                          width: {xs: '100%', sm: 'auto'}
                        }}
                      >
                        <BugIcon 
                          sx={{ 
                            fontSize: 40,
                            color: theme.palette[priorityInfo.color].main
                          }} 
                        />
                      </Box>
                      
                      {/* Основное содержимое */}
                      <Box sx={{ p: 2, flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', mb: 1 }}>
                          <Box component={Link} to={`/defects/${defect.id}`} sx={{ textDecoration: 'none', color: 'inherit', mr: 1 }}>
                            <Typography variant="h6" fontWeight="medium" gutterBottom>
                              {defect.title}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            <IconButton 
                              size="small"
                              onClick={(e) => handleOpenMenu(e, defect.id)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            mb: 2,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {defect.description}
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ color: 'text.secondary' }}>
                          <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <PersonIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                              <Typography variant="body2">
                                {defect.assigned_name || 'Не назначен'}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <FlagIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                              <Typography variant="body2">
                                Проект: {defect.project_name || 'Не указан'}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CalendarIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                              <Typography variant="body2">
                                Создан: {formatDate(defect.created_at)}
                              </Typography>
                            </Box>
                          </Grid>
                          
                          <Grid item xs={12} sm={6} md={3}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CalendarIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />
                              <Typography variant="body2">
                                Обновлен: {formatDate(defect.updated_at)}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    </Box>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BugIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {defects.length === 0 ? 'Нет доступных дефектов' : 'Дефекты не найдены'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 3 }}>
            {defects.length === 0 
              ? 'Создайте свой первый дефект, нажав кнопку "Создать дефект"' 
              : 'Попробуйте изменить параметры поиска или фильтры'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/defects/new')}
          >
            Создать дефект
          </Button>
        </Box>
      )}
      
      {/* Пагинация */}
      {pagination.total > pagination.limit && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination 
            count={Math.ceil(pagination.total / pagination.limit)} 
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
      
      {/* Меню действий для дефекта */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2, minWidth: 150 }
        }}
      >
        <MenuItem onClick={() => {
          navigate(`/defects/${selectedDefectId}`);
          handleCloseMenu();
        }}>
          <BugIcon fontSize="small" sx={{ mr: 2 }} />
          Просмотр
        </MenuItem>
        <MenuItem onClick={handleEditDefect}>
          <EditIcon fontSize="small" sx={{ mr: 2 }} />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleDeleteDialogOpen} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 2 }} />
          Удалить
        </MenuItem>
      </Menu>
      
      {/* Диалог подтверждения удаления */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
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
            onClick={handleDeleteDialogClose}
          >
            Отмена
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleDeleteConfirm}
            autoFocus
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DefectList;