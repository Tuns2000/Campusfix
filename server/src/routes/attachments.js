const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { param, validationResult } = require('express-validator');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const config = require('../config');

const router = express.Router();

// Применяем middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

// Конфигурация multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Создаем директорию для загрузок по дате
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uploadPath = path.join(process.cwd(), config.uploads.directory, `${year}-${month}`);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    // Генерируем уникальное имя файла с использованием UUID
    const uniqueFileName = `${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueFileName);
  }
});

// Фильтр типов файлов
const fileFilter = function(req, file, cb) {
  // Разрешенные типы файлов
  const allowedTypes = config.uploads.allowedTypes || [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Недопустимый тип файла. Разрешены только: ${allowedTypes.join(', ')}`), false);
  }
};

// Настройка multer с ограничением размера файла
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: config.uploads.maxFileSize || 10 * 1024 * 1024 // 10MB по умолчанию
  }
});

/**
 * @route GET /api/defects/:defectId/attachments
 * @desc Получение всех вложений для дефекта
 * @access Private (все авторизованные пользователи)
 */
router.get('/defects/:defectId/attachments', [
  param('defectId').isInt().withMessage('ID дефекта должен быть целым числом')
], async (req, res, next) => {
  try {
    const { defectId } = req.params;
    
    // Проверка существования дефекта
    const defectExists = await db.query('SELECT * FROM defects WHERE id = $1', [defectId]);
    
    if (defectExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Дефект не найден' 
      });
    }
    
    // Получение всех вложений для дефекта
    const result = await db.query(`
      SELECT a.*,
        u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM attachments a
      JOIN users u ON a.uploaded_by = u.id
      WHERE a.defect_id = $1
      ORDER BY a.created_at DESC
    `, [defectId]);
    
    const attachments = result.rows.map(attachment => ({
      id: attachment.id,
      fileName: attachment.file_name,
      fileType: attachment.file_type,
      fileSize: attachment.file_size,
      uploadedBy: {
        id: attachment.uploaded_by,
        name: attachment.uploaded_by_name
      },
      createdAt: attachment.created_at,
      url: `/uploads/${path.relative(path.join(process.cwd(), config.uploads.directory), attachment.file_path)}`
    }));
    
    res.json({
      success: true,
      attachments
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/attachments/:id
 * @desc Получение информации о конкретном вложении
 * @access Private (все авторизованные пользователи)
 */
router.get('/:id', [
  param('id').isInt().withMessage('ID вложения должен быть целым числом')
], async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Получение информации о вложении
    const result = await db.query(`
      SELECT a.*,
        u.first_name || ' ' || u.last_name as uploaded_by_name,
        d.title as defect_title,
        d.project_id as project_id,
        p.name as project_name
      FROM attachments a
      JOIN users u ON a.uploaded_by = u.id
      JOIN defects d ON a.defect_id = d.id
      JOIN projects p ON d.project_id = p.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Вложение не найдено' 
      });
    }
    
    const attachment = result.rows[0];
    
    res.json({
      success: true,
      attachment: {
        id: attachment.id,
        fileName: attachment.file_name,
        fileType: attachment.file_type,
        fileSize: attachment.file_size,
        defect: {
          id: attachment.defect_id,
          title: attachment.defect_title
        },
        project: {
          id: attachment.project_id,
          name: attachment.project_name
        },
        uploadedBy: {
          id: attachment.uploaded_by,
          name: attachment.uploaded_by_name
        },
        createdAt: attachment.created_at,
        url: `/uploads/${path.relative(path.join(process.cwd(), config.uploads.directory), attachment.file_path)}`
      }
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/defects/:defectId/attachments
 * @desc Загрузка файла к дефекту
 * @access Private (все авторизованные пользователи)
 */
router.post('/defects/:defectId/attachments', [
  param('defectId').isInt().withMessage('ID дефекта должен быть целым числом')
], upload.single('file'), async (req, res, next) => {
  try {
    const { defectId } = req.params;
    
    // Проверка наличия файла
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Файл не загружен' 
      });
    }
    
    // Проверка существования дефекта
    const defectExists = await db.query('SELECT * FROM defects WHERE id = $1', [defectId]);
    
    if (defectExists.rows.length === 0) {
      // Удаляем файл, если дефект не найден
      fs.unlinkSync(req.file.path);
      
      return res.status(404).json({ 
        success: false, 
        message: 'Дефект не найден' 
      });
    }
    
    // Сохранение информации о файле в базе данных
    const result = await db.query(`
      INSERT INTO attachments (
        defect_id, file_name, file_path, file_type, file_size, uploaded_by, created_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
      RETURNING id, defect_id, file_name, file_type, file_size, uploaded_by, created_at
    `, [
      defectId,
      req.file.originalname,
      req.file.path,
      req.file.mimetype,
      req.file.size,
      req.user.id
    ]);
    
    const attachment = result.rows[0];
    
    // Запись в историю изменений дефекта
    await db.query(`
      INSERT INTO defect_history (
        defect_id, user_id, field_name, new_value, created_at
      ) 
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [
      defectId,
      req.user.id,
      'вложение',
      `Добавлен файл: ${req.file.originalname}`
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Файл успешно загружен',
      attachment: {
        id: attachment.id,
        fileName: attachment.file_name,
        fileType: attachment.file_type,
        fileSize: attachment.file_size,
        defectId: attachment.defect_id,
        uploadedBy: req.user.id,
        createdAt: attachment.created_at,
        url: `/uploads/${path.relative(path.join(process.cwd(), config.uploads.directory), req.file.path)}`
      }
    });
    
  } catch (err) {
    // Если произошла ошибка, удаляем загруженный файл
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
});

/**
 * @route DELETE /api/attachments/:id
 * @desc Удаление вложения
 * @access Private (автор вложения, admin, manager)
 */
router.delete('/:id', [
  param('id').isInt().withMessage('ID вложения должен быть целым числом')
], async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Получение информации о вложении
    const attachmentExists = await db.query(
      'SELECT * FROM attachments WHERE id = $1',
      [id]
    );
    
    if (attachmentExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Вложение не найдено' 
      });
    }
    
    const attachment = attachmentExists.rows[0];
    
    // Проверка прав доступа
    if (attachment.uploaded_by !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ 
        success: false, 
        message: 'У вас нет прав для удаления этого вложения' 
      });
    }
    
    // Удаление файла с диска
    try {
      fs.unlinkSync(attachment.file_path);
    } catch (error) {
      console.error(`Ошибка при удалении файла ${attachment.file_path}:`, error);
      // Продолжаем выполнение даже если файл не найден на диске
    }
    
    // Удаление записи о файле из базы данных
    await db.query('DELETE FROM attachments WHERE id = $1', [id]);
    
    // Запись в историю изменений дефекта
    await db.query(`
      INSERT INTO defect_history (
        defect_id, user_id, field_name, new_value, created_at
      ) 
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [
      attachment.defect_id,
      req.user.id,
      'вложение',
      `Удален файл: ${attachment.file_name}`
    ]);
    
    res.json({
      success: true,
      message: 'Вложение успешно удалено'
    });
    
  } catch (err) {
    next(err);
  }
});

// Обработчик ошибок multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Ошибка от multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `Размер файла превышает допустимый лимит ${config.uploads.maxFileSize / (1024 * 1024)} МБ`
      });
    }
    return res.status(400).json({
      success: false,
      message: `Ошибка загрузки: ${err.message}`
    });
  } else if (err) {
    // Другая ошибка
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
  next();
});

module.exports = router;