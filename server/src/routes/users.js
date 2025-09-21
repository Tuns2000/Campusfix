const express = require('express');
const router = express.Router();
const db = require('../services/db');

// Получение списка всех пользователей
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, email, first_name, last_name, role FROM users');
    res.json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
});

// Получение информации о конкретном пользователе
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT id, email, first_name, last_name, role FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;