const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../services/db');
const config = require('../config');

const router = express.Router();

/**
 * Валидация данных регистрации
 */
const registerValidation = [
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
];

/**
 * Валидация данных входа
 */
const loginValidation = [
  body('email')
    .isEmail().withMessage('Введите корректный email')
    .normalizeEmail()
    .trim(),
  
  body('password')
    .notEmpty().withMessage('Введите пароль')
];

/**
 * @route POST /api/auth/register
 * @desc Регистрация нового пользователя
 * @access Public
 */
router.post('/register', registerValidation, async (req, res, next) => {
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
      'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role',
      [email, passwordHash, firstName, lastName, role]
    );
    
    const user = result.rows[0];
    
    // Создание JWT токена
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name 
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    // Логирование успешной регистрации
    console.log(`User registered: ${user.email}, role: ${user.role}, id: ${user.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token
    });
    
  } catch (err) {
    console.error('Registration error:', err);
    next(err);
  }
});

/**
 * @route POST /api/auth/login
 * @desc Аутентификация пользователя
 * @access Public
 */
router.post('/login', loginValidation, async (req, res, next) => {
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
    
    const { email, password } = req.body;
    
    // Поиск пользователя по email
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Неверный email или пароль' 
      });
    }
    
    const user = result.rows[0];
    
    // Проверка пароля
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Неверный email или пароль' 
      });
    }
    
    // Создание JWT токена
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name 
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    // Логирование успешного входа
    console.log(`User logged in: ${user.email}, role: ${user.role}, id: ${user.id}`);
    
    res.json({
      success: true,
      message: 'Успешная аутентификация',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token
    });
    
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
});

/**
 * @route GET /api/auth/me
 * @desc Получение информации о текущем пользователе
 * @access Private
 */
router.get('/me', async (req, res, next) => {
  try {
    // Проверка аутентификации
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Требуется авторизация' 
      });
    }
    
    // Получение данных пользователя из БД
    const result = await db.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
      [req.user.id]
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
        role: user.role
      }
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/auth/change-password
 * @desc Изменение пароля пользователя
 * @access Private
 */
router.post('/change-password', [
  body('currentPassword')
    .notEmpty().withMessage('Введите текущий пароль'),
  
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Новый пароль должен содержать минимум 8 символов')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/).withMessage('Пароль должен содержать цифры, заглавные и строчные буквы, и специальные символы')
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
    
    // Проверка аутентификации
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Требуется авторизация' 
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Получение данных пользователя из БД
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Пользователь не найден' 
      });
    }
    
    const user = result.rows[0];
    
    // Проверка текущего пароля
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Неверный текущий пароль' 
      });
    }
    
    // Хеширование нового пароля
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    
    // Обновление пароля в базе данных
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );
    
    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });
    
  } catch (err) {
    next(err);
  }
});

module.exports = router;