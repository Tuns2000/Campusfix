const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// Применяем middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

/**
 * @route GET /api/projects
 * @desc Получение списка всех проектов с фильтрацией
 * @access Private (все авторизованные пользователи)
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Формирование базового запроса
    let queryText = 'SELECT id, name, description, created_at, updated_at FROM projects';
    const queryParams = [];
    const conditions = [];
    
    // Добавление фильтров
    if (search) {
      queryParams.push(`%${search}%`);
      conditions.push(`(name ILIKE $${queryParams.length} OR description ILIKE $${queryParams.length})`);
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
    
    // Получение общего количества проектов (для пагинации)
    let countQuery = 'SELECT COUNT(*) FROM projects';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    const countResult = await db.query(countQuery, queryParams.slice(0, -2));
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      projects: result.rows,
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
 * @route GET /api/projects/:id
 * @desc Получение детальной информации о проекте, включая этапы
 * @access Private (все авторизованные пользователи)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Получение информации о проекте
    const projectResult = await db.query(
      'SELECT id, name, description, created_at, updated_at FROM projects WHERE id = $1',
      [id]
    );
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Проект не найден' 
      });
    }
    
    const project = projectResult.rows[0];
    
    // Получение этапов проекта
    const stagesResult = await db.query(
      'SELECT id, name, description, status, start_date, end_date, created_at, updated_at FROM project_stages WHERE project_id = $1 ORDER BY start_date ASC',
      [id]
    );
    
    // Получение статистики по дефектам проекта
    const defectStatsResult = await db.query(`
      SELECT 
        status, 
        COUNT(*) as count 
      FROM 
        defects 
      WHERE 
        project_id = $1 
      GROUP BY 
        status
    `, [id]);
    
    // Формирование итогового ответа
    res.json({
      success: true,
      project: {
        ...project,
        stages: stagesResult.rows,
        defectStats: defectStatsResult.rows
      }
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/projects
 * @desc Создание нового проекта
 * @access Private (admin, manager)
 */
router.post('/', [
  roleCheck(['admin', 'manager']),
  // Валидация входных данных
  body('name')
    .notEmpty().withMessage('Введите название проекта')
    .trim()
    .isLength({ max: 255 }).withMessage('Название не может быть длиннее 255 символов'),
  
  body('description')
    .optional()
    .trim()
], async (req, res, next) => {
  try {
    console.log('Создание проекта. Получены данные:', req.body);
    
    // Проверка результатов валидации
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ошибка валидации данных',
        errors: errors.array() 
      });
    }
    
    // Проверка обязательных полей
    const { name, description, status, priority } = req.body;
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Название и описание проекта обязательны'
      });
    }
    
    const { manager_id, start_date, end_date } = req.body;
    
    // Создание проекта
    const result = await db.query(
      `INSERT INTO projects 
       (name, description, status, priority, manager_id, start_date, end_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, name, description, status, priority, manager_id, start_date, end_date, created_at, updated_at`,
      [
        name, 
        description, 
        status || 'planned', 
        priority || 'medium', 
        manager_id || null, 
        start_date || null, 
        end_date || null
      ]
    );
    
    // Получаем созданный проект
    const project = result.rows[0];
    
    // Успешный ответ
    res.status(201).json({
      success: true,
      message: 'Проект успешно создан',
      project
    });
  } catch (error) {
    console.error('Ошибка при создании проекта:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании проекта',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/projects/:id
 * @desc Обновление информации о проекте
 * @access Private (admin, manager)
 */
router.put('/:id', [
  roleCheck(['admin', 'manager']),
  // Валидация входных данных
  body('name')
    .optional()
    .notEmpty().withMessage('Название не может быть пустым')
    .trim()
    .isLength({ max: 255 }).withMessage('Название не может быть длиннее 255 символов'),
  
  body('description')
    .optional()
    .trim()
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
    const { name, description } = req.body;
    
    // Проверка существования проекта
    const projectExists = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    
    if (projectExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Проект не найден' 
      });
    }
    
    // Формирование запроса на обновление
    const updateFields = [];
    const queryParams = [];
    
    // Добавляем поля для обновления
    if (name !== undefined) {
      queryParams.push(name);
      updateFields.push(`name = $${queryParams.length}`);
    }
    
    if (description !== undefined) {
      queryParams.push(description);
      updateFields.push(`description = $${queryParams.length}`);
    }
    
    // Если нечего обновлять, возвращаем текущие данные
    if (updateFields.length === 0) {
      return res.json({
        success: true,
        message: 'Данные проекта не изменены',
        project: projectExists.rows[0]
      });
    }
    
    // Добавляем обновление времени
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    // Добавляем ID проекта в параметры
    queryParams.push(id);
    
    // Выполняем запрос на обновление
    const result = await db.query(
      `UPDATE projects SET ${updateFields.join(', ')} WHERE id = $${queryParams.length} RETURNING id, name, description, updated_at`,
      queryParams
    );
    
    const updatedProject = result.rows[0];
    
    res.json({
      success: true,
      message: 'Проект успешно обновлен',
      project: updatedProject
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route DELETE /api/projects/:id
 * @desc Удаление проекта
 * @access Private (admin)
 */
router.delete('/:id', roleCheck(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверка существования проекта
    const projectExists = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    
    if (projectExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Проект не найден' 
      });
    }
    
    // Проверка, есть ли дефекты, связанные с проектом
    const defectsCount = await db.query(
      'SELECT COUNT(*) FROM defects WHERE project_id = $1',
      [id]
    );
    
    if (parseInt(defectsCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Невозможно удалить проект, так как с ним связаны дефекты' 
      });
    }
    
    // Удаление этапов проекта
    await db.query('DELETE FROM project_stages WHERE project_id = $1', [id]);
    
    // Удаление проекта
    await db.query('DELETE FROM projects WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Проект и все связанные с ним этапы успешно удалены'
    });
    
  } catch (err) {
    next(err);
  }
});

module.exports = router;