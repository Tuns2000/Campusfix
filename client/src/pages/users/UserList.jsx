import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Container,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Tooltip,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Avatar,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

import { fetchUsers, deleteUser, resetSuccess } from '../../lib/slices/usersSlice';

const UserList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { users, loading, error, success } = useSelector(state => state.users);
  const { user: currentUser } = useSelector(state => state.auth);
  
  // Состояние для пагинации и поиска
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Состояние для меню действий
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  // Состояние для диалога подтверждения удаления
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Загрузка пользователей
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);
  
  // Фильтрация пользователей по поисковому запросу
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.first_name && user.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.last_name && user.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.department && user.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Обработчики для пагинации
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Обработчики для поиска
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };
  
  // Обработчики для меню действий
  const handleMenuOpen = (event, userId) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserId(userId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUserId(null);
  };
  
  // Обработчики для действий с пользователями
  const handleViewUser = (userId) => {
    handleMenuClose();
    navigate(`/users/${userId}`);
  };

  const handleEditUser = (userId) => {
    handleMenuClose();
    navigate(`/users/${userId}/edit`);
  };

  const handleOpenDeleteDialog = (userId) => {
    handleMenuClose();
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      dispatch(deleteUser(userToDelete));
      handleCloseDeleteDialog();
    }
  };
  
  // Обработчик для создания нового пользователя
  const handleCreateUser = () => {
    navigate('/users/new');
  };
  
  // Получение стиля для роли пользователя
  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return { label: 'Администратор', color: 'error' };
      case 'manager':
        return { label: 'Менеджер', color: 'warning' };
      case 'engineer':
        return { label: 'Инженер', color: 'info' };
      case 'observer':
        return { label: 'Наблюдатель', color: 'default' };
      default:
        return { label: role, color: 'default' };
    }
  };
  
  // Создание инициалов для аватара
  const getInitials = (firstName, lastName) => {
    let initials = '';
    if (firstName) initials += firstName.charAt(0).toUpperCase();
    if (lastName) initials += lastName.charAt(0).toUpperCase();
    return initials || '?';
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Пользователи
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateUser}
          disabled={!currentUser || currentUser.role !== 'admin'}
        >
          Добавить пользователя
        </Button>
      </Box>
      
      {/* Панель поиска */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Поиск пользователей..."
          fullWidth
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>
      
      {/* Таблица пользователей */}
      <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme => theme.palette.action.hover }}>
                <TableCell>Пользователь</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Роль</TableCell>
                <TableCell>Должность</TableCell>
                <TableCell>Отдел</TableCell>
                <TableCell align="center">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(user => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ mr: 2, bgcolor: theme => theme.palette.primary.main }}
                          src={user.avatar}
                        >
                          {getInitials(user.first_name, user.last_name)}
                        </Avatar>
                        <Typography>
                          {user.first_name || user.last_name 
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim() 
                            : 'Неизвестный пользователь'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getRoleInfo(user.role).label} 
                        color={getRoleInfo(user.role).color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.position || '-'}</TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <IconButton onClick={() => handleViewUser(user.id)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        {currentUser && currentUser.role === 'admin' && (
                          <>
                            <IconButton onClick={() => handleEditUser(user.id)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={() => handleOpenDeleteDialog(user.id)} 
                              disabled={currentUser.id === user.id}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">
                      {loading ? 'Загрузка пользователей...' : 'Пользователи не найдены'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Пагинация */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Записей на странице:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
        />
      </Card>
      
      {/* Диалог подтверждения удаления */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">Подтверждение удаления</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить этого пользователя? Это действие нельзя отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Отмена</Button>
          <Button onClick={handleDeleteUser} color="error" autoFocus>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserList;