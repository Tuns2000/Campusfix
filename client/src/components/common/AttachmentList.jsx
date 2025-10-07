import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
  Grid,
  Card,
  CardMedia,
  CardActions,
  CircularProgress
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { attachmentsApi } from '../../lib/api';

// Функция для определения типа файла и выбора иконки
const getFileIcon = (fileType) => {
  if (fileType.startsWith('image/')) {
    return <ImageIcon color="primary" />;
  } else if (fileType === 'application/pdf') {
    return <PdfIcon color="error" />;
  } else if (fileType.includes('word') || fileType.includes('document')) {
    return <DocIcon color="info" />;
  } else {
    return <FileIcon color="action" />;
  }
};

// Форматирование размера файла
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' Б';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' КБ';
  else return (bytes / 1048576).toFixed(1) + ' МБ';
};

const AttachmentList = ({ attachments, onDelete, canDelete = false, loading = false }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Открытие предпросмотра файла
  const handlePreview = (attachment) => {
    setPreviewFile(attachment);
    setPreviewOpen(true);
  };

  // Закрытие предпросмотра
  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
  };

  // Запрос на подтверждение удаления
  const handleDeleteClick = (id) => {
    setConfirmDeleteId(id);
  };

  // Подтверждение удаления
  const confirmDelete = async () => {
    if (confirmDeleteId && onDelete) {
      await onDelete(confirmDeleteId);
    }
    setConfirmDeleteId(null);
  };

  // Отмена удаления
  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  // Скачивание файла
  const handleDownload = (attachment) => {
    const url = attachmentsApi.getDownloadUrl(attachment.id);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', attachment.file_name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Получение URL для предпросмотра
  const getPreviewUrl = (attachmentId) => {
    return `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/attachments/${attachmentId}/preview`;
  };

  // Определяем, можно ли сделать предпросмотр файла
  const isPreviewable = (fileType) => {
    return fileType.startsWith('image/') || fileType === 'application/pdf';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary" sx={{ my: 2 }}>
        Вложения отсутствуют
      </Typography>
    );
  }

  return (
    <Box>
      <List>
        {attachments.map((attachment) => (
          <ListItem
            key={attachment.id}
            divider
            sx={{ 
              '&:hover': { 
                bgcolor: 'rgba(0, 0, 0, 0.04)' 
              } 
            }}
          >
            <ListItemIcon>
              {getFileIcon(attachment.file_type)}
            </ListItemIcon>
            <ListItemText
              primary={attachment.file_name}
              secondary={
                <>
                  <span>{formatFileSize(attachment.file_size)}</span>
                  {attachment.created_at && (
                    <span> · {format(new Date(attachment.created_at), 'dd MMM yyyy HH:mm', { locale: ru })}</span>
                  )}
                  {attachment.first_name && (
                    <span> · {attachment.first_name} {attachment.last_name}</span>
                  )}
                </>
              }
            />
            <ListItemSecondaryAction>
              {isPreviewable(attachment.file_type) && (
                <Tooltip title="Просмотреть">
                  <IconButton edge="end" onClick={() => handlePreview(attachment)}>
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Скачать">
                <IconButton edge="end" onClick={() => handleDownload(attachment)}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              {canDelete && (
                <Tooltip title="Удалить">
                  <IconButton edge="end" onClick={() => handleDeleteClick(attachment.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* Диалог предпросмотра */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh', maxHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>{previewFile?.file_name}</Grid>
            <Grid item>
              <IconButton edge="end" onClick={handleClosePreview}>
                <CloseIcon />
              </IconButton>
            </Grid>
          </Grid>
        </DialogTitle>
        <DialogContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {previewFile?.file_type.startsWith('image/') ? (
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                image={getPreviewUrl(previewFile.id)}
                alt={previewFile.file_name}
                sx={{
                  height: '100%',
                  objectFit: 'contain',
                  bgcolor: 'rgba(0, 0, 0, 0.03)'
                }}
              />
            </Card>
          ) : previewFile?.file_type === 'application/pdf' ? (
            <iframe
              src={getPreviewUrl(previewFile.id)}
              title={previewFile.file_name}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              sandbox="allow-same-origin"
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography variant="body1">
                Предпросмотр недоступен для этого типа файла.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview} color="primary">
            Закрыть
          </Button>
          <Button 
            onClick={() => handleDownload(previewFile)} 
            color="primary" 
            startIcon={<DownloadIcon />}
          >
            Скачать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={confirmDeleteId !== null}
        onClose={cancelDelete}
      >
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы действительно хотите удалить этот файл? Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="primary">
            Отмена
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttachmentList;