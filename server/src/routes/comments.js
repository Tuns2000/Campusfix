const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Применяем middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

/**
 * @route 
 * @desc Получение всех комментариев к дефекту
 * @access Private (все авторизованные пользователи)
 */
router.get('/:defectId/comments', [
  param('defectId').isInt().withMessage('ID дефекта должен быть целым числом')
], async (req, res, next) => {
  try {
    const { defectId } = req.params;
    
    // Проверка существования дефекта
    const defectExists = await db.query('SELECT * FROM defects WHERE id = $1', [defectId]);
    
    if (defectExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Дефект не найден' 
      });
    }
    
    // Получение всех комментариев к дефекту
    const result = await db.query(`
      SELECT c.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.defect_id = $1
      ORDER BY c.created_at DESC
    `, [defectId]);
    
    const comments = result.rows.map(comment => ({
      id: comment.id,
      content: comment.content,
      user: {
        id: comment.user_id,
        name: comment.user_name,
        email: comment.user_email,
        role: comment.user_role
      },
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    }));
    
    res.json({
      success: true,
      comments
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/defects/:defectId/comments
 * @desc Добавление комментария к дефекту
 * @access Private (все авторизованные пользователи)
 */
router.post('/:defectId/comments', [
  param('defectId').isInt().withMessage('ID дефекта должен быть целым числом'),
  body('content')
    .notEmpty().withMessage('Комментарий не может быть пустым')
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
    
    const { defectId } = req.params;
    const { content } = req.body;
    
    // Проверка существования дефекта
    const defectExists = await db.query('SELECT * FROM defects WHERE id = $1', [defectId]);
    
    if (defectExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Дефект не найден' 
      });
    }
    
    // Добавление комментария
    const result = await db.query(`
      INSERT INTO comments (defect_id, user_id, content, created_at) 
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
      RETURNING id, defect_id, user_id, content, created_at
    `, [defectId, req.user.id, content]);
    
    const comment = result.rows[0];
    
    // Запись в историю дефекта
    await db.query(`
      INSERT INTO defect_history (defect_id, user_id, field_name, new_value, created_at) 
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [defectId, req.user.id, 'комментарий', 'Добавлен новый комментарий']);
    
    res.status(201).json({
      success: true,
      message: 'Комментарий успешно добавлен',
      comment: {
        id: comment.id,
        defectId: comment.defect_id,
        userId: comment.user_id,
        content: comment.content,
        createdAt: comment.created_at
      }
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route PUT /api/defects/:defectId/comments/:commentId
 * @desc Обновление комментария
 * @access Private (автор комментария, admin, manager)
 */
router.put('/:defectId/comments/:commentId', [
  param('defectId').isInt().withMessage('ID дефекта должен быть целым числом'),
  param('commentId').isInt().withMessage('ID комментария должен быть целым числом'),
  body('content')
    .notEmpty().withMessage('Комментарий не может быть пустым')
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
    
    const { defectId, commentId } = req.params;
    const { content } = req.body;
    
    // Проверка существования комментария
    const commentExists = await db.query(
      'SELECT * FROM comments WHERE id = $1 AND defect_id = $2',
      [commentId, defectId]
    );
    
    if (commentExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Комментарий не найден или не принадлежит указанному дефекту' 
      });
    }
    
    const comment = commentExists.rows[0];
    
    // Проверка прав: только автор комментария, admin или manager могут редактировать
    if (comment.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ 
        success: false, 
        message: 'У вас нет прав для редактирования этого комментария' 
      });
    }
    
    // Обновление комментария
    const result = await db.query(`
      UPDATE comments 
      SET content = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, defect_id, user_id, content, created_at, updated_at
    `, [content, commentId]);
    
    const updatedComment = result.rows[0];
    
    res.json({
      success: true,
      message: 'Комментарий успешно обновлен',
      comment: {
        id: updatedComment.id,
        defectId: updatedComment.defect_id,
        userId: updatedComment.user_id,
        content: updatedComment.content,
        createdAt: updatedComment.created_at,
        updatedAt: updatedComment.updated_at
      }
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route DELETE /api/defects/:defectId/comments/:commentId
 * @desc Удаление комментария
 * @access Private (автор комментария, admin, manager)
 */
router.delete('/:defectId/comments/:commentId', [
  param('defectId').isInt().withMessage('ID дефекта должен быть целым числом'),
  param('commentId').isInt().withMessage('ID комментария должен быть целым числом')
], async (req, res, next) => {
  try {
    const { defectId, commentId } = req.params;
    
    // Проверка существования комментария
    const commentExists = await db.query(
      'SELECT * FROM comments WHERE id = $1 AND defect_id = $2',
      [commentId, defectId]
    );
    
    if (commentExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Комментарий не найден или не принадлежит указанному дефекту' 
      });
    }
    
    const comment = commentExists.rows[0];
    
    // Проверка прав: только автор комментария, admin или manager могут удалять
    if (comment.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ 
        success: false, 
        message: 'У вас нет прав для удаления этого комментария' 
      });
    }
    
    // Удаление комментария
    await db.query('DELETE FROM comments WHERE id = $1', [commentId]);
    
    res.json({
      success: true,
      message: 'Комментарий успешно удален'
    });
    
  } catch (err) {
    next(err);
  }
});

module.exports = router;