const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// Применяем middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

/**
 * @route GET /api/projects/:projectId/stages
 * @desc Получение всех этапов проекта
 * @access Private (все авторизованные пользователи)
 */
router.get('/:projectId/stages', [
  param('projectId').isInt().withMessage('ID проекта должен быть целым числом')
], async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    // Проверяем существование проекта
    const projectExists = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    
    if (projectExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Проект не найден' 
      });
    }
    
    // Получаем все этапы проекта
    const result = await db.query(
      'SELECT id, name, description, status, start_date, end_date, created_at, updated_at FROM project_stages WHERE project_id = $1 ORDER BY start_date ASC',
      [projectId]
    );
    
    res.json({
      success: true,
      stages: result.rows
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/projects/:projectId/stages/:stageId
 * @desc Получение информации о конкретном этапе проекта
 * @access Private (все авторизованные пользователи)
 */
router.get('/:projectId/stages/:stageId', [
  param('projectId').isInt().withMessage('ID проекта должен быть целым числом'),
  param('stageId').isInt().withMessage('ID этапа должен быть целым числом')
], async (req, res, next) => {
  try {
    const { projectId, stageId } = req.params;
    
    // Получаем информацию об этапе
    const result = await db.query(
      'SELECT id, project_id, name, description, status, start_date, end_date, created_at, updated_at FROM project_stages WHERE id = $1 AND project_id = $2',
      [stageId, projectId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Этап не найден или не принадлежит указанному проекту' 
      });
    }
    
    res.json({
      success: true,
      stage: result.rows[0]
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/projects/:projectId/stages
 * @desc Создание нового этапа проекта
 * @access Private (admin, manager, engineer)
 */
router.post('/:projectId/stages', [
  roleCheck(['admin', 'manager', 'engineer']),
  param('projectId').isInt().withMessage('ID проекта должен быть целым числом'),
  // Валидация входных данных
  body('name')
    .notEmpty().withMessage('Введите название этапа')
    .trim()
    .isLength({ max: 255 }).withMessage('Название не может быть длиннее 255 символов'),
  
  body('description')
    .optional()
    .trim(),
  
  body('status')
    .isIn(['планирование', 'в работе', 'завершен', 'отменен']).withMessage('Некорректный статус'),
  
  body('startDate')
    .isISO8601().withMessage('Неверный формат даты начала'),
  
  body('endDate')
    .optional()
    .isISO8601().withMessage('Неверный формат даты окончания')
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
    
    const { projectId } = req.params;
    const { name, description, status, startDate, endDate } = req.body;
    
    // Проверяем существование проекта
    const projectExists = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    
    if (projectExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Проект не найден' 
      });
    }
    
    // Создаем новый этап
    const result = await db.query(
      `INSERT INTO project_stages 
       (project_id, name, description, status, start_date, end_date, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
       RETURNING id, project_id, name, description, status, start_date, end_date, created_at`,
      [projectId, name, description, status, startDate, endDate]
    );
    
    const newStage = result.rows[0];
    
    res.status(201).json({
      success: true,
      message: 'Этап успешно создан',
      stage: newStage
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route PUT /api/projects/:projectId/stages/:stageId
 * @desc Обновление информации об этапе проекта
 * @access Private (admin, manager, engineer)
 */
router.put('/:projectId/stages/:stageId', [
  roleCheck(['admin', 'manager', 'engineer']),
  param('projectId').isInt().withMessage('ID проекта должен быть целым числом'),
  param('stageId').isInt().withMessage('ID этапа должен быть целым числом'),
  // Валидация входных данных
  body('name')
    .optional()
    .notEmpty().withMessage('Название не может быть пустым')
    .trim()
    .isLength({ max: 255 }).withMessage('Название не может быть длиннее 255 символов'),
  
  body('description')
    .optional()
    .trim(),
  
  body('status')
    .optional()
    .isIn(['планирование', 'в работе', 'завершен', 'отменен']).withMessage('Некорректный статус'),
  
  body('startDate')
    .optional()
    .isISO8601().withMessage('Неверный формат даты начала'),
  
  body('endDate')
    .optional()
    .isISO8601().withMessage('Неверный формат даты окончания')
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
    
    const { projectId, stageId } = req.params;
    const { name, description, status, startDate, endDate } = req.body;
    
    // Проверяем существование этапа
    const stageExists = await db.query(
      'SELECT * FROM project_stages WHERE id = $1 AND project_id = $2',
      [stageId, projectId]
    );
    
    if (stageExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Этап не найден или не принадлежит указанному проекту' 
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
    
    if (status !== undefined) {
      queryParams.push(status);
      updateFields.push(`status = $${queryParams.length}`);
    }
    
    if (startDate !== undefined) {
      queryParams.push(startDate);
      updateFields.push(`start_date = $${queryParams.length}`);
    }
    
    if (endDate !== undefined) {
      queryParams.push(endDate);
      updateFields.push(`end_date = $${queryParams.length}`);
    }
    
    // Если нечего обновлять, возвращаем текущие данные
    if (updateFields.length === 0) {
      return res.json({
        success: true,
        message: 'Данные этапа не изменены',
        stage: stageExists.rows[0]
      });
    }
    
    // Добавляем обновление времени
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    // Добавляем ID этапа и ID проекта в параметры
    queryParams.push(stageId, projectId);
    
    // Выполняем запрос на обновление
    const result = await db.query(
      `UPDATE project_stages 
       SET ${updateFields.join(', ')} 
       WHERE id = $${queryParams.length - 1} AND project_id = $${queryParams.length} 
       RETURNING id, project_id, name, description, status, start_date, end_date, updated_at`,
      queryParams
    );
    
    const updatedStage = result.rows[0];
    
    res.json({
      success: true,
      message: 'Этап успешно обновлен',
      stage: updatedStage
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route DELETE /api/projects/:projectId/stages/:stageId
 * @desc Удаление этапа проекта
 * @access Private (admin, manager)
 */
router.delete('/:projectId/stages/:stageId', [
  roleCheck(['admin', 'manager']),
  param('projectId').isInt().withMessage('ID проекта должен быть целым числом'),
  param('stageId').isInt().withMessage('ID этапа должен быть целым числом')
], async (req, res, next) => {
  try {
    const { projectId, stageId } = req.params;
    
    // Проверяем существование этапа
    const stageExists = await db.query(
      'SELECT * FROM project_stages WHERE id = $1 AND project_id = $2',
      [stageId, projectId]
    );
    
    if (stageExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Этап не найден или не принадлежит указанному проекту' 
      });
    }
    
    // Проверяем, связаны ли с этапом дефекты
    const defectsCount = await db.query(
      'SELECT COUNT(*) FROM defects WHERE stage_id = $1',
      [stageId]
    );
    
    if (parseInt(defectsCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Невозможно удалить этап, так как с ним связаны дефекты' 
      });
    }
    
    // Удаляем этап
    await db.query('DELETE FROM project_stages WHERE id = $1', [stageId]);
    
    res.json({
      success: true,
      message: 'Этап успешно удален'
    });
    
  } catch (err) {
    next(err);
  }
});

module.exports = router;