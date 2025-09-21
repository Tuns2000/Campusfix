const express = require('express');
const router = express.Router();
const db = require('../services/db');

// Получение списка всех дефектов
router.get('/', async (req, res, next) => {
  try {
    // Базовый запрос
    let query = `
      SELECT d.*, p.name as project_name,
      u.first_name || ' ' || u.last_name as assigned_name
      FROM defects d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u ON d.assigned_to = u.id
    `;
    
    // Параметры запроса
    const params = [];
    
    // Фильтры
    const conditions = [];
    
    // Фильтр по статусу
    if (req.query.status) {
      conditions.push(`d.status = $${params.length + 1}`);
      params.push(req.query.status);
    }
    
    // Фильтр по приоритету
    if (req.query.priority) {
      conditions.push(`d.priority = $${params.length + 1}`);
      params.push(req.query.priority);
    }
    
    // Фильтр по проекту
    if (req.query.project) {
      conditions.push(`d.project_id = $${params.length + 1}`);
      params.push(parseInt(req.query.project));
    }
    
    // Поиск по названию или описанию
    if (req.query.search) {
      conditions.push(`(d.title ILIKE $${params.length + 1} OR d.description ILIKE $${params.length + 1})`);
      params.push(`%${req.query.search}%`);
    }
    
    // Добавляем условия в запрос
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Сортировка
    query += ' ORDER BY d.created_at DESC';
    
    // Пагинация
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    // Выполнение запроса
    const result = await db.query(query, params);
    
    // Получение общего количества записей для пагинации
    let countQuery = 'SELECT COUNT(*) FROM defects d';
    
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    const countResult = await db.query(countQuery, params.slice(0, -2));
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      defects: result.rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;