const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../services/db');
const config = require('../config');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Регистрация нового пользователя
 */
router.post('/register', [
  // Валидация входных данных
  body('email').isEmail().withMessage('Введите корректный email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов'),
  body('firstName').notEmpty().withMessage('Введите имя'),
  body('lastName').notEmpty().withMessage('Введите фамилию'),
  body('role').isIn(['admin', 'manager', 'engineer', 'observer']).withMessage('Некорректная роль')
], async (req, res, next) => {
  try {
    // Проверка результатов валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
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
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
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
    next(err);
  }
});

/**
 * @route POST /api/auth/login
 * @desc Аутентификация пользователя
 */
router.post('/login', [
  body('email').isEmail().withMessage('Введите корректный email'),
  body('password').notEmpty().withMessage('Введите пароль')
], async (req, res, next) => {
  try {
    // Проверка результатов валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
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
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
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
    next(err);
  }
});

module.exports = router;