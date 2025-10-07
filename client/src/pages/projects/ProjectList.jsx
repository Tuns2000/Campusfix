import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
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
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  Flag as FlagIcon
} from '@mui/icons-material';
import DownloadIcon from '@mui/icons-material/Download';
import { fetchProjects, deleteProject, resetProjectMessages } from '../../lib/slices/projectsSlice';
import { reportsApi } from '../../lib/api';
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

const ProjectList = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projects, loading, error } = useSelector((state) => state.projects);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Запрос списка проектов при загрузке
  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);
  
  // Фильтрация проектов при изменении поискового запроса
  useEffect(() => {
    if (projects.length) {
      const filtered = projects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [projects, searchTerm]);
  
  // Очищаем сообщения при размонтировании
  useEffect(() => {
    return () => {
      dispatch(resetProjectMessages());
    };
  }, [dispatch]);
  
  // Обработчики меню
  const handleOpenMenu = (event, projectId) => {
    setAnchorEl(event.currentTarget);
    setSelectedProjectId(projectId);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedProjectId(null);
  };
  
  const handleEditProject = () => {
    navigate(`/projects/${selectedProjectId}/edit`);
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
    dispatch(deleteProject(selectedProjectId))
      .unwrap()
      .then(() => {
        // Обработка успешного удаления
      })
      .catch((error) => {
        // Обработка ошибки
        console.error('Ошибка при удалении проекта:', error);
      });
    setDeleteDialogOpen(false);
  };
  
  // Функция экспорта проектов
  const handleExportProjects = (format = 'excel') => {
    reportsApi.exportProjects(format);
  };

  if (loading && projects.length === 0) {
    return <LoadingScreen />;
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок и кнопка создания */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Проекты
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/projects/new')}
          sx={{ 
            px: 3, 
            py: 1, 
            borderRadius: 2,
            backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`
          }}
        >
          Создать проект
        </Button>
      </Box>
      
      {/* Поиск */}
      <Box sx={{ mb: 4, maxWidth: 500 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Поиск проектов..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            sx: { borderRadius: 2, bgcolor: 'background.paper' }
          }}
        />
      </Box>
      
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
      
      {/* Список проектов */}
      {filteredProjects.length > 0 ? (
        <Grid container spacing={3}>
          {filteredProjects.map((project, index) => {
            const statusInfo = getStatusInfo(project.status);
            
            return (
              <Grid item xs={12} md={6} lg={4} key={project.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card 
                    sx={{ 
                      p: 0,
                      borderRadius: 3,
                      overflow: 'visible',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                      }
                    }}
                  >
                    <Box 
                      sx={{ 
                        p: 3,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}
                    >
                      <Box component={Link} to={`/projects/${project.id}`} sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                          {project.name}
                        </Typography>
                        <Chip 
                          label={statusInfo.label} 
                          color={statusInfo.color} 
                          size="small" 
                          sx={{ mb: 2 }}
                        />
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            height: 60,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical'
                          }}
                        >
                          {project.description}
                        </Typography>
                      </Box>
                      
                      <IconButton 
                        aria-label="действия" 
                        size="small"
                        onClick={(e) => handleOpenMenu(e, project.id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                    
                    <Box sx={{ p: 3, pt: 2, mt: 'auto' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Создан: {formatDate(project.created_at)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Ответственный: {project.manager_name || 'Не назначен'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <FlagIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          Приоритет: {project.priority === 'high' ? 'Высокий' : project.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </Typography>
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
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {projects.length === 0 ? 'Нет доступных проектов' : 'Проекты не найдены'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {projects.length === 0 
              ? 'Создайте свой первый проект, нажав кнопку "Создать проект"' 
              : 'Попробуйте изменить параметры поиска'}
          </Typography>
        </Box>
      )}
      
      {/* Меню действий для проекта */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 2, minWidth: 150 }
        }}
      >
        <MenuItem onClick={handleEditProject}>
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
            Вы действительно хотите удалить этот проект? Это действие нельзя отменить.
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

export default ProjectList;