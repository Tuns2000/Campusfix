import React, { useState } from 'react';
import { 
  Button, 
  Box, 
  Typography, 
  CircularProgress, 
  Alert,
  IconButton
} from '@mui/material';
import { 
  CloudUpload as CloudUploadIcon, 
  Clear as ClearIcon 
} from '@mui/icons-material';

const FileUploader = ({ onUpload, maxFiles = 5, maxSize = 10 }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setError('');
    const selectedFiles = Array.from(e.target.files);
    
    // Проверка количества файлов
    if (selectedFiles.length > maxFiles) {
      setError(`Максимальное количество файлов: ${maxFiles}`);
      return;
    }
    
    // Проверка размера файлов (в МБ)
    const oversizedFiles = selectedFiles.filter(file => file.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError(`Некоторые файлы превышают максимальный размер (${maxSize} МБ)`);
      return;
    }
    
    setFiles(selectedFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Выберите файлы для загрузки');
      return;
    }
    
    try {
      setUploading(true);
      setError('');
      
      // Вызываем callback с выбранными файлами
      await onUpload(files);
      
      // Очищаем список файлов после успешной загрузки
      setFiles([]);
    } catch (error) {
      console.error('Ошибка при загрузке файлов:', error);
      setError('Произошла ошибка при загрузке файлов');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  return (
    <Box sx={{ mt: 2 }}>
      <input
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
        style={{ display: 'none' }}
        id="file-upload"
        type="file"
        multiple
        onChange={handleFileChange}
        disabled={uploading}
      />
      <label htmlFor="file-upload">
        <Button
          variant="outlined"
          component="span"
          disabled={uploading}
          startIcon={<CloudUploadIcon />}
          sx={{ mb: 2 }}
        >
          Выбрать файлы
        </Button>
      </label>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {files.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Выбрано файлов: {files.length}
          </Typography>
          {files.map((file, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} МБ)
              </Typography>
              <IconButton size="small" onClick={() => removeFile(index)}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Button
        variant="contained"
        color="primary"
        disabled={files.length === 0 || uploading}
        onClick={handleUpload}
        startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {uploading ? 'Загрузка...' : 'Загрузить'}
      </Button>
    </Box>
  );
};

export default FileUploader;