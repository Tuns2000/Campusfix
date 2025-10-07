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

// Добавьте эти маршруты до маршрута с параметрами '/:id'

/**
 * @route GET /api/users
 * @desc Получение списка всех пользователей (только для админа)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Проверка прав доступа: только админ может получить список всех пользователей
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для просмотра списка пользователей'
      });
    }

    // Параметры пагинации и сортировки
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'desc';

    // Параметры фильтрации
    const { search, role } = req.query;
    
    // Построение запроса с фильтрами
    let query = `
      SELECT id, email, first_name, last_name, role, phone, position, department, created_at, updated_at
      FROM users
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;
    
    if (search) {
      query += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (role) {
      query += ` AND role = $${paramIndex}`;
      queryParams.push(role);
      paramIndex++;
    }
    
    // Валидация полей сортировки для безопасности
    const validSortColumns = ['created_at', 'email', 'first_name', 'last_name', 'role'];
    const validSortDirections = ['asc', 'desc'];
    
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = validSortDirections.includes(sortOrder.toLowerCase()) ? sortOrder : 'desc';
    
    // Добавление сортировки и пагинации
    query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    
    // Выполнение запроса
    const result = await db.query(query, queryParams);
    
    // Запрос для получения общего количества записей
    let countQuery = `
      SELECT COUNT(*) AS total 
      FROM users
      WHERE 1=1
    `;
    
    if (search) {
      countQuery += ` AND (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)`;
    }
    
    if (role && search) {
      countQuery += ` AND role = $2`;
    } else if (role) {
      countQuery += ` AND role = $1`;
    }
    
    const countParams = [];
    if (search) countParams.push(`%${search}%`);
    if (role) countParams.push(role);
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      users: result.rows,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @route POST /api/users
 * @desc Создание нового пользователя (только для админа)
 */
router.post('/', authMiddleware, [
  body('email').isEmail().withMessage('Введите корректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов'),
  body('first_name').optional().isString().trim().isLength({ max: 100 }),
  body('last_name').optional().isString().trim().isLength({ max: 100 }),
  body('role').isIn(['admin', 'manager', 'engineer', 'observer']).withMessage('Некорректная роль'),
  body('phone').optional().isString().trim().isLength({ max: 20 }),
  body('position').optional().isString().trim().isLength({ max: 100 }),
  body('department').optional().isString().trim().isLength({ max: 100 }),
], async (req, res) => {
  try {
    // Проверка прав доступа: только админ может создавать пользователей
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для создания пользователей'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors: errors.array()
      });
    }
    
    const { email, password, first_name, last_name, role, phone, position, department } = req.body;
    
    // Проверка, существует ли пользователь с таким email
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким email уже существует'
      });
    }
    
    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создание пользователя
    const result = await db.query(
      `INSERT INTO users 
       (email, password_hash, first_name, last_name, role, phone, position, department) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, email, first_name, last_name, role, phone, position, department, created_at`,
      [email, hashedPassword, first_name, last_name, role, phone, position, department]
    );
    
    res.status(201).json({
      success: true,
      message: 'Пользователь успешно создан',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @route PUT /api/users/:id
 * @desc Обновление пользователя (только для админа)
 */
router.put('/:id', authMiddleware, [
  body('email').optional().isEmail().withMessage('Введите корректный email'),
  body('password').optional().isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов'),
  body('first_name').optional().isString().trim().isLength({ max: 100 }),
  body('last_name').optional().isString().trim().isLength({ max: 100 }),
  body('role').optional().isIn(['admin', 'manager', 'engineer', 'observer']).withMessage('Некорректная роль'),
  body('phone').optional().isString().trim().isLength({ max: 20 }),
  body('position').optional().isString().trim().isLength({ max: 100 }),
  body('department').optional().isString().trim().isLength({ max: 100 }),
], async (req, res) => {
  try {
    // Проверка прав доступа: только админ может обновлять пользователей
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для обновления пользователей'
      });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors: errors.array()
      });
    }
    
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный ID пользователя'
      });
    }
    
    // Проверка существования пользователя
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Формирование запроса для обновления
    const { email, password, first_name, last_name, role, phone, position, department } = req.body;
    
    let updateFields = [];
    let queryParams = [];
    let paramIndex = 1;
    
    if (email !== undefined) {
      // Проверка уникальности email
      const emailCheck = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким email уже существует'
        });
      }
      
      updateFields.push(`email = $${paramIndex}`);
      queryParams.push(email);
      paramIndex++;
    }
    
    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password_hash = $${paramIndex}`);
      queryParams.push(hashedPassword);
      paramIndex++;
    }
    
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
    
    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex}`);
      queryParams.push(role);
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
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, email, first_name, last_name, role, phone, position, department, created_at, updated_at
    `;
    
    const result = await db.query(updateQuery, queryParams);
    
    res.json({
      success: true,
      message: 'Пользователь успешно обновлен',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @route DELETE /api/users/:id
 * @desc Удаление пользователя (только для админа)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Проверка прав доступа: только админ может удалять пользователей
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для удаления пользователей'
      });
    }
    
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный ID пользователя'
      });
    }
    
    // Проверка, не пытается ли админ удалить самого себя
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Вы не можете удалить свой собственный аккаунт'
      });
    }
    
    // Проверка существования пользователя
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    // Удаление пользователя
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    
    res.json({
      success: true,
      message: 'Пользователь успешно удален'
    });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
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