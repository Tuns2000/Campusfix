const express = require('express');
const router = express.Router();
const db = require('../services/db');

// Получение списка всех проектов
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json({ success: true, projects: result.rows });
  } catch (err) {
    next(err);
  }
});

// Получение информации о конкретном проекте
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Проект не найден' });
    }
    
    // Получаем этапы проекта
    const stagesResult = await db.query('SELECT * FROM project_stages WHERE project_id = $1 ORDER BY start_date', [id]);
    
    const project = result.rows[0];
    project.stages = stagesResult.rows;
    
    res.json({ success: true, project });
  } catch (err) {
    next(err);
  }
});

module.exports = router;