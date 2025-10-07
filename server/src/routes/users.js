const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка хранилища файлов для аватаров
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../uploads', new Date().toISOString().slice(0, 7));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// ВАЖНО: Специфические маршруты должны идти ПЕРЕД маршрутами с параметрами!

/**
 * @route GET /api/users/profile
 * @desc Получение профиля текущего пользователя
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await db.query(
      `SELECT id, email, first_name, last_name, role, avatar, phone, position, department, created_at 
       FROM users 
       WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    res.json({
      success: true,
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка при получении профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @route PUT /api/users/profile
 * @desc Обновление профиля пользователя
 */
router.put('/profile', authMiddleware, [
  body('first_name').optional().isString().trim().isLength({ max: 100 }),
  body('last_name').optional().isString().trim().isLength({ max: 100 }),
  body('phone').optional().isString().trim().isLength({ max: 20 }),
  body('position').optional().isString().trim().isLength({ max: 100 }),
  body('department').optional().isString().trim().isLength({ max: 100 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors: errors.array()
      });
    }
    
    const userId = req.user.id;
    const { first_name, last_name, phone, position, department } = req.body;
    
    // Обновляем только переданные поля
    let updateFields = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (first_name !== undefined) {
      updateFields.push(`first_name = $${paramIndex}`);
      queryParams.push(first_name);
      paramIndex++;
    }
    
    if (last_name !== undefined) {
      updateFields.push(`last_name = $${paramIndex}`);
      queryParams.push(last_name);
      paramIndex++;
    }
    
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      queryParams.push(phone);
      paramIndex++;
    }
    
    if (position !== undefined) {
      updateFields.push(`position = $${paramIndex}`);
      queryParams.push(position);
      paramIndex++;
    }
    
    if (department !== undefined) {
      updateFields.push(`department = $${paramIndex}`);
      queryParams.push(department);
      paramIndex++;
    }
    
    // Если нечего обновлять
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Не переданы данные для обновления'
      });
    }
    
    // Добавляем ID пользователя в параметры
    queryParams.push(userId);
    
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, first_name, last_name, role, avatar, phone, position, department, created_at
    `;
    
    const result = await db.query(updateQuery, queryParams);
    
    res.json({
      success: true,
      message: 'Профиль успешно обновлен',
      profile: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @route PUT /api/users/change-password
 * @desc Изменение пароля пользователя
 */
router.put('/change-password', authMiddleware, [
  body('currentPassword').notEmpty().withMessage('Текущий пароль обязателен'),
  body('newPassword').isLength({ min: 6 }).withMessage('Новый пароль должен быть не менее 6 символов')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors: errors.array()
      });
    }
    
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Проверяем текущий пароль
    const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    const isPasswordValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Текущий пароль неверен'
      });
    }
    
    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Обновляем пароль
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
    
    res.json({
      success: true,
      message: 'Пароль успешно обновлен'
    });
  } catch (error) {
    console.error('Ошибка при обновлении пароля:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @route POST /api/users/avatar
 * @desc Загрузка аватара пользователя
 */
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Файл не загружен'
      });
    }
    
    const userId = req.user.id;
    const avatarUrl = `/uploads/${req.file.filename}`;
    
    await db.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatarUrl, userId]);
    
    res.json({
      success: true,
      message: 'Аватар успешно обновлен',
      avatar: avatarUrl
    });
  } catch (error) {
    console.error('Ошибка при загрузке аватара:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Только после специфических маршрутов должны идти общие маршруты с параметрами:

/**
 * @route GET /api/users/:id
 * @desc Получение информации о пользователе по ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный ID пользователя'
      });
    }
    
    // Проверка прав доступа: только админ, менеджер или сам пользователь могут просматривать информацию
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'У вас нет прав для просмотра этой информации' 
      });
    }
    
    const result = await db.query(
      'SELECT id, email, first_name, last_name, role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Пользователь не найден' 
      });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
    
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// ... другие существующие маршруты ...

module.exports = router;