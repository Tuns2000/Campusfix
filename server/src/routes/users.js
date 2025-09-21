const express = require('express');
const bcrypt = require('bcrypt');
const { body, query, validationResult } = require('express-validator');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// Применяем middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

/**
 * @route GET /api/users
 * @desc Получение списка всех пользователей с фильтрацией
 * @access Private (admin, manager)
 */
router.get('/', roleCheck(['admin', 'manager']), async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Формирование базового запроса
    let queryText = 'SELECT id, email, first_name, last_name, role, created_at FROM users';
    const queryParams = [];
    const conditions = [];
    
    // Добавление фильтров
    if (role) {
      queryParams.push(role);
      conditions.push(`role = $${queryParams.length}`);
    }
    
    if (search) {
      queryParams.push(`%${search}%`);
      conditions.push(`(email ILIKE $${queryParams.length} OR first_name ILIKE $${queryParams.length} OR last_name ILIKE $${queryParams.length})`);
    }
    
    // Добавление условий в запрос
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Добавление сортировки и пагинации
    queryText += ' ORDER BY created_at DESC';
    queryText += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    // Выполнение запроса
    const result = await db.query(queryText, queryParams);
    
    // Получение общего количества пользователей (для пагинации)
    let countQuery = 'SELECT COUNT(*) FROM users';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      users: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at
      })),
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/users/:id
 * @desc Получение информации о конкретном пользователе
 * @access Private (admin, manager, self)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверка прав доступа: только админ, менеджер или сам пользователь могут просматривать информацию
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'У вас нет прав для просмотра этой информации' 
      });
    }
    
    const result = await db.query(
      'SELECT id, email, first_name, last_name, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
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
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/users
 * @desc Создание нового пользователя (только для админов)
 * @access Private (admin)
 */
router.post('/', [
  roleCheck(['admin']),
  // Валидация входных данных
  body('email')
    .isEmail().withMessage('Введите корректный email')
    .normalizeEmail()
    .trim(),
  
  body('password')
    .isLength({ min: 8 }).withMessage('Пароль должен содержать минимум 8 символов')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/).withMessage('Пароль должен содержать цифры, заглавные и строчные буквы, и специальные символы'),
  
  body('firstName')
    .notEmpty().withMessage('Введите имя')
    .trim()
    .isLength({ max: 100 }).withMessage('Имя не может быть длиннее 100 символов'),
  
  body('lastName')
    .notEmpty().withMessage('Введите фамилию')
    .trim()
    .isLength({ max: 100 }).withMessage('Фамилия не может быть длиннее 100 символов'),
  
  body('role')
    .isIn(['admin', 'manager', 'engineer', 'observer']).withMessage('Некорректная роль')
], async (req, res, next) => {
  try {
    // Проверка результатов валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ошибка валидации данных',
        errors: errors.array() 
      });
    }
    
    const { email, password, firstName, lastName, role } = req.body;
    
    // Проверка, существует ли пользователь с таким email
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userExists.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Пользователь с таким email уже существует' 
      });
    }
    
    // Хеширование пароля
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Создание пользователя
    const result = await db.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role, created_at',
      [email, passwordHash, firstName, lastName, role]
    );
    
    const user = result.rows[0];
    
    res.status(201).json({
      success: true,
      message: 'Пользователь успешно создан',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at
      }
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route PUT /api/users/:id
 * @desc Обновление информации о пользователе
 * @access Private (admin, self)
 */
router.put('/:id', [
  // Валидация входных данных
  body('firstName')
    .optional()
    .notEmpty().withMessage('Имя не может быть пустым')
    .trim()
    .isLength({ max: 100 }).withMessage('Имя не может быть длиннее 100 символов'),
  
  body('lastName')
    .optional()
    .notEmpty().withMessage('Фамилия не может быть пустой')
    .trim()
    .isLength({ max: 100 }).withMessage('Фамилия не может быть длиннее 100 символов'),
  
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'engineer', 'observer']).withMessage('Некорректная роль')
], async (req, res, next) => {
  try {
    // Проверка результатов валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ошибка валидации данных',
        errors: errors.array() 
      });
    }
    
    const { id } = req.params;
    
    // Проверка прав доступа
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'У вас нет прав для изменения этого пользователя' 
      });
    }
    
    // Проверка существования пользователя
    const userExists = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Пользователь не найден' 
      });
    }
    
    const currentUser = userExists.rows[0];
    
    // Формирование запроса на обновление
    const updateFields = [];
    const queryParams = [];
    
    // Добавляем поля для обновления
    if (req.body.firstName !== undefined) {
      queryParams.push(req.body.firstName);
      updateFields.push(`first_name = $${queryParams.length}`);
    }
    
    if (req.body.lastName !== undefined) {
      queryParams.push(req.body.lastName);
      updateFields.push(`last_name = $${queryParams.length}`);
    }
    
    // Роль может менять только администратор
    if (req.body.role !== undefined && req.user.role === 'admin') {
      queryParams.push(req.body.role);
      updateFields.push(`role = $${queryParams.length}`);
    }
    
    // Если нечего обновлять, возвращаем текущие данные
    if (updateFields.length === 0) {
      return res.json({
        success: true,
        message: 'Данные пользователя не изменены',
        user: {
          id: currentUser.id,
          email: currentUser.email,
          firstName: currentUser.first_name,
          lastName: currentUser.last_name,
          role: currentUser.role
        }
      });
    }
    
    // Добавляем обновление времени
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    // Добавляем ID пользователя в параметры
    queryParams.push(id);
    
    // Выполняем запрос на обновление
    const result = await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${queryParams.length} RETURNING id, email, first_name, last_name, role, updated_at`,
      queryParams
    );
    
    const updatedUser = result.rows[0];
    
    res.json({
      success: true,
      message: 'Данные пользователя успешно обновлены',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        updatedAt: updatedUser.updated_at
      }
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route DELETE /api/users/:id
 * @desc Удаление пользователя
 * @access Private (admin)
 */
router.delete('/:id', roleCheck(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверка, не пытается ли пользователь удалить сам себя
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Вы не можете удалить свою учетную запись' 
      });
    }
    
    // Проверка существования пользователя
    const userExists = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    
    if (userExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Пользователь не найден' 
      });
    }
    
    // Удаление пользователя
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Пользователь успешно удален'
    });
    
  } catch (err) {
    next(err);
  }
});

module.exports = router;