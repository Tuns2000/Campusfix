const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../services/db');
const config = require('../config');

// Настройка хранилища multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Создаем директорию если она не существует
    const uploadDir = path.join(__dirname, '../../', config.uploads.directory);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'attachment-' + uniqueSuffix + ext);
  }
});

// Настройка фильтра для типов файлов
const fileFilter = (req, file, cb) => {
  if (config.uploads.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла. Разрешены только: ' + config.uploads.allowedTypes.join(', ')), false);
  }
};

// Инициализация multer
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: config.uploads.maxSize
  }
});

// Загрузка вложения для дефекта
router.post('/:defectId', upload.single('file'), async (req, res, next) => {
  try {
    const { defectId } = req.params;
    const { file } = req;
    
    // Проверяем, существует ли дефект
    const defectExists = await db.query('SELECT * FROM defects WHERE id = $1', [defectId]);
    
    if (defectExists.rows.length === 0) {
      // Удаляем загруженный файл
      if (file && file.path) {
        fs.unlinkSync(file.path);
      }
      return res.status(404).json({ success: false, message: 'Дефект не найден' });
    }
    
    // Сохраняем информацию о файле в БД
    const filePath = file.path.replace(/\\/g, '/'); // Нормализация путей для Windows
    const relativePath = filePath.substring(filePath.indexOf(config.uploads.directory));
    
    const result = await db.query(
      'INSERT INTO attachments (defect_id, file_name, file_path, file_type, file_size, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [defectId, file.originalname, relativePath, file.mimetype, file.size, req.user.id]
    );
    
    res.status(201).json({
      success: true,
      message: 'Файл успешно загружен',
      attachment: result.rows[0]
    });
    
  } catch (err) {
    next(err);
  }
});

module.exports = router;