const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// Применяем middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

/**
 * @route GET /api/defects
 * @desc Получение списка дефектов с фильтрацией и сортировкой
 * @access Private (все авторизованные пользователи)
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    // Добавляем логирование
    console.log('GET /defects запрос с параметрами:', req.query);
    
    // Базовый запрос
    let query = `
      SELECT 
        d.*,
        p.name as project_name,
        s.name as stage_name
      FROM 
        defects d
      LEFT JOIN 
        projects p ON d.project_id = p.id
      LEFT JOIN 
        project_stages s ON d.stage_id = s.id
      WHERE 1=1
    `;
    
    // Добавляем условия фильтрации
    const conditions = [];
    const params = [];
    
    const { 
      project, 
      stage, 
      status, 
      priority, 
      assignedTo, 
      reportedBy, 
      search, 
      sortBy = 'created_at', 
      sortOrder = 'desc', 
      page = 1, 
      limit = 10 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Добавление фильтров
    if (project) {
      params.push(project);
      conditions.push(`d.project_id = $${params.length}`);
    }
    
    if (stage) {
      params.push(stage);
      conditions.push(`d.stage_id = $${params.length}`);
    }
    
    if (status) {
      params.push(status);
      conditions.push(`d.status = $${params.length}`);
    }
    
    if (priority) {
      params.push(priority);
      conditions.push(`d.priority = $${params.length}`);
    }
    
    if (assignedTo) {
      params.push(assignedTo);
      conditions.push(`d.assigned_to = $${params.length}`);
    }
    
    if (reportedBy) {
      params.push(reportedBy);
      conditions.push(`d.reported_by = $${params.length}`);
    }
    
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(d.title ILIKE $${params.length} OR d.description ILIKE $${params.length} OR d.location ILIKE $${params.length})`);
    }
    
    // Добавление условий в запрос
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    // Сортировка и пагинация
    query += ' ORDER BY d.created_at DESC';
    
    // Выполняем запрос
    const result = await db.query(query, params);
    
    // Возвращаем результаты
    res.json({
      success: true,
      defects: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Ошибка при получении списка дефектов:', error);
    next(error);
  }
});

/**
 * @route GET /api/defects/:id
 * @desc Получение детальной информации о дефекте, включая вложения и комментарии
 * @access Private (все авторизованные пользователи)
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Получение информации о дефекте
    const defectResult = await db.query(`
      SELECT d.*, 
        p.name as project_name, 
        ps.name as stage_name,
        u1.first_name || ' ' || u1.last_name as reported_by_name,
        u1.email as reported_by_email,
        u2.first_name || ' ' || u2.last_name as assigned_to_name,
        u2.email as assigned_to_email
      FROM defects d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN project_stages ps ON d.stage_id = ps.id
      LEFT JOIN users u1 ON d.reported_by = u1.id
      LEFT JOIN users u2 ON d.assigned_to = u2.id
      WHERE d.id = $1
    `, [id]);
    
    if (defectResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Дефект не найден' 
      });
    }
    
    const defect = defectResult.rows[0];
    
    // Получение вложений дефекта
    const attachmentsResult = await db.query(`
      SELECT a.*, 
        u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.defect_id = $1
      ORDER BY a.created_at DESC
    `, [id]);
    
    // Получение комментариев к дефекту
    const commentsResult = await db.query(`
      SELECT c.*, 
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.defect_id = $1
      ORDER BY c.created_at DESC
    `, [id]);
    
    // Получение истории изменений дефекта
    const historyResult = await db.query(`
      SELECT h.*, 
        u.first_name || ' ' || u.last_name as user_name
      FROM defect_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.defect_id = $1
      ORDER BY h.created_at DESC
    `, [id]);
    
    // Форматирование данных для ответа
    const formattedDefect = {
      id: defect.id,
      title: defect.title,
      description: defect.description,
      status: defect.status,
      priority: defect.priority,
      project: {
        id: defect.project_id,
        name: defect.project_name
      },
      stage: defect.stage_id ? {
        id: defect.stage_id,
        name: defect.stage_name
      } : null,
      reportedBy: {
        id: defect.reported_by,
        name: defect.reported_by_name,
        email: defect.reported_by_email
      },
      assignedTo: defect.assigned_to ? {
        id: defect.assigned_to,
        name: defect.assigned_to_name,
        email: defect.assigned_to_email
      } : null,
      location: defect.location,
      dueDate: defect.due_date,
      createdAt: defect.created_at,
      updatedAt: defect.updated_at,
      closedAt: defect.closed_at,
      attachments: attachmentsResult.rows.map(attachment => ({
        id: attachment.id,
        fileName: attachment.file_name,
        filePath: attachment.file_path,
        fileType: attachment.file_type,
        fileSize: attachment.file_size,
        uploadedBy: {
          id: attachment.uploaded_by,
          name: attachment.uploaded_by_name
        },
        createdAt: attachment.created_at
      })),
      comments: commentsResult.rows.map(comment => ({
        id: comment.id,
        content: comment.content,
        user: {
          id: comment.user_id,
          name: comment.user_name,
          email: comment.user_email
        },
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      })),
      history: historyResult.rows.map(record => ({
        id: record.id,
        fieldName: record.field_name,
        oldValue: record.old_value,
        newValue: record.new_value,
        user: {
          id: record.user_id,
          name: record.user_name
        },
        createdAt: record.created_at
      }))
    };
    
    res.json({
      success: true,
      defect: formattedDefect
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/defects
 * @desc Создание нового дефекта
 * @access Private (все авторизованные пользователи)
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    console.log('Полученные данные:', req.body);
    
    // Проверка существования проекта
    const projectResult = await db.query('SELECT * FROM projects WHERE id = $1', [req.body.project_id]);
    const projects = projectResult.rows;
    
    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Проект не найден'
      });
    }
    
    // Проверка обязательных полей
    if (!req.body.title || !req.body.description) {
      return res.status(400).json({
        success: false,
        message: 'Название и описание дефекта обязательны'
      });
    }
    
    // Проверка и нормализация данных
    const defectData = {
      title: req.body.title,
      description: req.body.description,
      project_id: req.body.project_id,
      stage_id: req.body.stage_id || null,
      
      // Явная нормализация русских значений
      status: ['новый', 'подтвержден', 'в работе', 'исправлен', 'проверен', 'закрыт', 'отклонен'].includes(req.body.status) 
        ? req.body.status : 'новый',
        
      priority: ['низкий', 'средний', 'высокий', 'критический'].includes(req.body.priority) 
        ? req.body.priority : 'средний',
      
      // Явно указываем reported_by, гарантируем не-null значение
      reported_by: req.body.reported_by || req.user.id,
      
      assigned_to: req.body.assigned_to || null,
      location: req.body.location || '',
      steps_to_reproduce: req.body.steps_to_reproduce || '',
      expected_result: req.body.expected_result || '',
      actual_result: req.body.actual_result || ''
    };
    
    console.log('Нормализованные данные для вставки:', defectData);
    console.log('Priority type:', typeof defectData.priority, 'value:', defectData.priority);
    console.log('Reported by:', defectData.reported_by);
    
    // SQL-запрос для вставки
    const insertQuery = `
      INSERT INTO defects (
        title, description, project_id, stage_id, status, priority, 
        reported_by, assigned_to, location, steps_to_reproduce, expected_result, actual_result
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      defectData.title,
      defectData.description,
      defectData.project_id,
      defectData.stage_id,
      defectData.status,
      defectData.priority,
      defectData.reported_by,
      defectData.assigned_to,
      defectData.location,
      defectData.steps_to_reproduce,
      defectData.expected_result,
      defectData.actual_result
    ];
    
    // Выполнение запроса с обработкой ошибок
    try {
      const insertResult = await db.query(insertQuery, values);
      const newDefect = insertResult.rows[0];
      
      res.status(201).json({
        success: true,
        message: 'Дефект успешно создан',
        defect: newDefect
      });
    } catch (dbError) {
      console.error('Ошибка выполнения SQL:', dbError);
      console.error('Данные для вставки:', values);
      
      res.status(500).json({
        success: false,
        message: 'Ошибка при создании дефекта',
        details: dbError.message
      });
    }
  } catch (error) {
    console.error('Общая ошибка:', error);
    next(error);
  }
});

/**
 * @route PUT /api/defects/:id
 * @desc Обновление информации о дефекте
 * @access Private (авторизованные пользователи с соответствующими правами)
 */
router.put('/:id', [
  param('id').isInt().withMessage('ID дефекта должен быть целым числом'),
  // Валидация входных данных
  body('title')
    .optional()
    .notEmpty().withMessage('Название не может быть пустым')
    .trim()
    .isLength({ max: 255 }).withMessage('Название не может быть длиннее 255 символов'),
  
  body('description')
    .optional()
    .trim(),
  
  body('status')
    .optional()
    .isIn(['новый', 'подтвержден', 'в работе', 'исправлен', 'проверен', 'закрыт', 'отклонен']).withMessage('Некорректный статус'),
  
  body('priority')
    .optional()
    .isIn(['низкий', 'средний', 'высокий', 'критический']).withMessage('Некорректный приоритет'),
  
  body('stageId')
    .optional()
    .isInt().withMessage('ID этапа должен быть целым числом'),
  
  body('assignedTo')
    .optional()
    .isInt().withMessage('ID исполнителя должен быть целым числом'),
  
  body('location')
    .optional()
    .trim(),
  
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Неверный формат даты')
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
    const { 
      title, 
      description, 
      status, 
      priority, 
      stageId, 
      assignedTo, 
      location, 
      dueDate 
    } = req.body;
    
    // Получение текущих данных дефекта для сравнения и проверки прав
    const defectExists = await db.query('SELECT * FROM defects WHERE id = $1', [id]);
    
    if (defectExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Дефект не найден' 
      });
    }
    
    const currentDefect = defectExists.rows[0];
    
    // Проверка прав доступа
    // Только автор дефекта, назначенный исполнитель, менеджер или админ могут редактировать
    const isAuthor = currentDefect.reported_by === req.user.id;
    const isAssignee = currentDefect.assigned_to === req.user.id;
    const isManager = req.user.role === 'manager' || req.user.role === 'admin';
    
    if (!isAuthor && !isAssignee && !isManager) {
      return res.status(403).json({ 
        success: false, 
        message: 'У вас нет прав для редактирования этого дефекта' 
      });
    }
    
    // Формирование запроса на обновление
    const updateFields = [];
    const queryParams = [];
    const historyRecords = [];
    
    // Проверка каждого поля и добавление в список обновлений и истории
    if (title !== undefined && title !== currentDefect.title) {
      queryParams.push(title);
      updateFields.push(`title = $${queryParams.length}`);
      historyRecords.push({
        field: 'title',
        oldValue: currentDefect.title,
        newValue: title
      });
    }
    
    if (description !== undefined && description !== currentDefect.description) {
      queryParams.push(description);
      updateFields.push(`description = $${queryParams.length}`);
      historyRecords.push({
        field: 'description',
        oldValue: currentDefect.description,
        newValue: description
      });
    }
    
    if (status !== undefined && status !== currentDefect.status) {
      // Проверка допустимых переходов статусов
      const isValidStatusChange = checkStatusTransition(currentDefect.status, status, req.user.role);
      
      if (!isValidStatusChange) {
        return res.status(400).json({ 
          success: false, 
          message: `Недопустимое изменение статуса с "${currentDefect.status}" на "${status}"` 
        });
      }
      
      queryParams.push(status);
      updateFields.push(`status = $${queryParams.length}`);
      historyRecords.push({
        field: 'status',
        oldValue: currentDefect.status,
        newValue: status
      });
      
      // Если статус изменен на 'закрыт', устанавливаем дату закрытия
      if (status === 'закрыт') {
        updateFields.push('closed_at = CURRENT_TIMESTAMP');
      } else if (currentDefect.closed_at) {
        // Если дефект был ранее закрыт, а теперь открыт снова, очищаем дату закрытия
        updateFields.push('closed_at = NULL');
      }
    }
    
    if (priority !== undefined && priority !== currentDefect.priority) {
      queryParams.push(priority);
      updateFields.push(`priority = $${queryParams.length}`);
      historyRecords.push({
        field: 'priority',
        oldValue: currentDefect.priority,
        newValue: priority
      });
    }
    
    if (stageId !== undefined && stageId !== currentDefect.stage_id) {
      // Проверка существования этапа и принадлежности к тому же проекту
      if (stageId) {
        const stageExists = await db.query(
          'SELECT * FROM project_stages WHERE id = $1 AND project_id = $2',
          [stageId, currentDefect.project_id]
        );
        
        if (stageExists.rows.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Этап не найден или не принадлежит проекту дефекта' 
          });
        }
      }
      
      queryParams.push(stageId);
      updateFields.push(`stage_id = $${queryParams.length}`);
      historyRecords.push({
        field: 'stage_id',
        oldValue: currentDefect.stage_id,
        newValue: stageId
      });
    }
    
    if (assignedTo !== undefined && assignedTo !== currentDefect.assigned_to) {
      // Проверка существования пользователя, если задан
      if (assignedTo) {
        const userExists = await db.query('SELECT * FROM users WHERE id = $1', [assignedTo]);
        
        if (userExists.rows.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Указанный пользователь не найден' 
          });
        }
      }
      
      queryParams.push(assignedTo);
      updateFields.push(`assigned_to = $${queryParams.length}`);
      historyRecords.push({
        field: 'assigned_to',
        oldValue: currentDefect.assigned_to,
        newValue: assignedTo
      });
    }
    
    if (location !== undefined && location !== currentDefect.location) {
      queryParams.push(location);
      updateFields.push(`location = $${queryParams.length}`);
      historyRecords.push({
        field: 'location',
        oldValue: currentDefect.location,
        newValue: location
      });
    }
    
    if (dueDate !== undefined && dueDate !== currentDefect.due_date) {
      queryParams.push(dueDate);
      updateFields.push(`due_date = $${queryParams.length}`);
      historyRecords.push({
        field: 'due_date',
        oldValue: currentDefect.due_date,
        newValue: dueDate
      });
    }
    
    // Если нечего обновлять, возвращаем текущие данные
    if (updateFields.length === 0) {
      return res.json({
        success: true,
        message: 'Данные дефекта не изменены',
        defect: {
          id: currentDefect.id,
          title: currentDefect.title,
          description: currentDefect.description,
          status: currentDefect.status,
          priority: currentDefect.priority,
          projectId: currentDefect.project_id,
          stageId: currentDefect.stage_id,
          reportedBy: currentDefect.reported_by,
          assignedTo: currentDefect.assigned_to,
          location: currentDefect.location,
          dueDate: currentDefect.due_date,
          createdAt: currentDefect.created_at,
          updatedAt: currentDefect.updated_at,
          closedAt: currentDefect.closed_at
        }
      });
    }
    
    // Добавляем обновление времени
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    // Добавляем ID дефекта в параметры
    queryParams.push(id);
    
    // Выполняем запрос на обновление
    const result = await db.query(
      `UPDATE defects SET ${updateFields.join(', ')} WHERE id = $${queryParams.length} RETURNING *`,
      queryParams
    );
    
    const updatedDefect = result.rows[0];
    
    // Записываем историю изменений
    for (const record of historyRecords) {
      await db.query(
        'INSERT INTO defect_history (defect_id, user_id, field_name, old_value, new_value, created_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
        [id, req.user.id, record.field, record.oldValue, record.newValue]
      );
    }
    
    res.json({
      success: true,
      message: 'Дефект успешно обновлен',
      defect: {
        id: updatedDefect.id,
        title: updatedDefect.title,
        description: updatedDefect.description,
        status: updatedDefect.status,
        priority: updatedDefect.priority,
        projectId: updatedDefect.project_id,
        stageId: updatedDefect.stage_id,
        reportedBy: updatedDefect.reported_by,
        assignedTo: updatedDefect.assigned_to,
        location: updatedDefect.location,
        dueDate: updatedDefect.due_date,
        createdAt: updatedDefect.created_at,
        updatedAt: updatedDefect.updated_at,
        closedAt: updatedDefect.closed_at
      }
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route DELETE /api/defects/:id
 * @desc Удаление дефекта
 * @access Private (admin, manager)
 */
router.delete('/:id', roleCheck(['admin', 'manager']), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Проверка существования дефекта
    const defectExists = await db.query('SELECT * FROM defects WHERE id = $1', [id]);
    
    if (defectExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Дефект не найден' 
      });
    }
    
    // Удаление связанных данных (комментарии, вложения, история)
    await db.query('DELETE FROM comments WHERE defect_id = $1', [id]);
    await db.query('DELETE FROM attachments WHERE defect_id = $1', [id]);
    await db.query('DELETE FROM defect_history WHERE defect_id = $1', [id]);
    
    // Удаление дефекта
    await db.query('DELETE FROM defects WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Дефект и все связанные с ним данные успешно удалены'
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * Вспомогательная функция для проверки допустимых переходов статусов
 * @param {string} currentStatus - Текущий статус дефекта
 * @param {string} newStatus - Новый статус дефекта
 * @param {string} userRole - Роль пользователя
 * @returns {boolean} - Допустим ли такой переход
 */
function checkStatusTransition(currentStatus, newStatus, userRole) {
  // Админ может делать любые переходы
  if (userRole === 'admin') {
    return true;
  }
  
  // Словарь допустимых переходов для разных ролей
  const allowedTransitions = {
    // Менеджеры могут менять практически любые статусы
    manager: {
      'новый': ['подтвержден', 'отклонен'],
      'подтвержден': ['в работе', 'отклонен'],
      'в работе': ['исправлен', 'отклонен'],
      'исправлен': ['проверен', 'в работе'],
      'проверен': ['закрыт', 'в работе'],
      'закрыт': [], // Закрытый дефект не меняет статус
      'отклонен': ['новый', 'подтвержден']
    },
    
    // Инженеры могут менять статусы в рамках своей работы
    engineer: {
      'новый': [], // Инженер не может менять статус новых дефектов
      'подтвержден': ['в работе'],
      'в работе': ['исправлен'],
      'исправлен': [], // Инженер не может подтверждать исправления
      'проверен': [], // Инженер не может закрывать дефекты
      'закрыт': [], // Инженер не может менять статус закрытых дефектов
      'отклонен': [] // Инженер не может менять статус отклоненных дефектов
    },
    
    // Наблюдатели могут только проверять исправления
    observer: {
      'новый': [], // Наблюдатель может только создавать новые дефекты, но не менять их статус
      'подтвержден': [],
      'в работе': [],
      'исправлен': ['проверен', 'в работе'], // Может подтвердить или вернуть в работу
      'проверен': [],
      'закрыт': [],
      'отклонен': []
    }
  };
  
  // Определяем разрешенные переходы для текущей роли, или используем пустой массив если роль не определена
  const transitions = allowedTransitions[userRole] || {};
  const allowedForStatus = transitions[currentStatus] || [];
  
  return allowedForStatus.includes(newStatus);
}

module.exports = router;