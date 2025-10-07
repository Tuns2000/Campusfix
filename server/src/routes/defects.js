const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
      project_id, // Изменено с project на project_id для соответствия с клиентом
      stage_id,  // Изменено с stage на stage_id для соответствия с клиентом
      status, 
      priority, 
      assigned_to, // Изменено с assignedTo на assigned_to
      reported_by, // Изменено с reportedBy на reported_by
      search, 
      sortBy = 'created_at', 
      sortOrder = 'desc', 
      page = 1, 
      limit = 10 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Добавление фильтров
    if (project_id) {
      params.push(project_id);
      conditions.push(`d.project_id = $${params.length}`);
    }
    
    if (stage_id) {
      params.push(stage_id);
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
    
    if (assigned_to) {
      params.push(assigned_to);
      conditions.push(`d.assigned_to = $${params.length}`);
    }
    
    if (reported_by) {
      params.push(reported_by);
      conditions.push(`d.reported_by = $${params.length}`);
    }
    
    if (search) {
      params.push(`%${search}%`);
      // Исправление для предотвращения ошибки дублирования параметров
      conditions.push(`(d.title ILIKE $${params.length} OR d.description ILIKE $${params.length} OR d.location ILIKE $${params.length})`);
    }
    
    // Добавление условий в запрос
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    // Добавляем сортировку
    if (sortBy) {
      // Безопасно добавляем сортировку (защита от SQL-инъекций)
      const validSortColumns = ['created_at', 'updated_at', 'priority', 'status'];
      const validSortDirection = ['asc', 'desc'];
      
      const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = validSortDirection.includes(sortOrder.toLowerCase()) ? sortOrder : 'desc';
      
      query += ` ORDER BY d.${safeSortBy} ${safeSortOrder}`;
    } else {
      // Сортировка по умолчанию
      query += ' ORDER BY d.created_at DESC';
    }
    
    // Добавляем пагинацию
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('Выполнение SQL-запроса:', query, params);
    
    // Выполняем запрос
    const result = await db.query(query, params);
    
    // Получаем общее количество записей для пагинации
    const countQuery = `
      SELECT COUNT(*) as total
      FROM defects d
      WHERE 1=1 ${conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : ''}
    `;
    
    const countResult = await db.query(countQuery, params.slice(0, params.length - 2));
    const total = parseInt(countResult.rows[0].total);
    
    // Возвращаем результаты
    res.json({
      success: true,
      defects: result.rows,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
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
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const defectId = parseInt(req.params.id);
    
    if (isNaN(defectId)) {
      return res.status(400).json({
        success: false,
        message: 'Неверный формат ID'
      });
    }
    
    // Получаем базовую информацию о дефекте
    const defectResult = await db.query(`
      SELECT d.*, 
             p.name as project_name,
             u1.first_name as reporter_first_name, 
             u1.last_name as reporter_last_name,
             u2.first_name as assignee_first_name, 
             u2.last_name as assignee_last_name
      FROM defects d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u1 ON d.reported_by = u1.id
      LEFT JOIN users u2 ON d.assigned_to = u2.id
      WHERE d.id = $1
    `, [defectId]);
    
    if (defectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Дефект не найден'
      });
    }
    
    const defect = defectResult.rows[0];
    
    // Формируем объект с полной информацией
    const fullDefect = {
      ...defect,
      project: {
        id: defect.project_id,
        name: defect.project_name
      },
      reporter: {
        id: defect.reported_by,
        first_name: defect.reporter_first_name,
        last_name: defect.reporter_last_name
      },
      assigned_to: defect.assigned_to ? {
        id: defect.assigned_to,
        first_name: defect.assignee_first_name,
        last_name: defect.assignee_last_name
      } : null
    };
    
    // Удаляем избыточные поля
    delete fullDefect.project_name;
    delete fullDefect.reporter_first_name;
    delete fullDefect.reporter_last_name;
    delete fullDefect.assignee_first_name;
    delete fullDefect.assignee_last_name;
    
    // Возвращаем полные данные
    res.json({
      success: true,
      defect: fullDefect
    });
    
  } catch (error) {
    console.error('Ошибка при получении дефекта:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

/**
 * @route POST /api/defects
 * @desc Создание нового дефекта
 * @access Private (все авторизованные пользователи)
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Получаем данные из запроса
    const { 
      title, 
      description, 
      project_id, 
      status, 
      priority,
      reported_by,
      assigned_to,
      steps_to_reproduce,
      expected_result,
      actual_result,
      location
    } = req.body;
    
    console.log('Получены данные для создания дефекта:', req.body);
    
    // Создаем дефект
    const result = await db.query(`
      INSERT INTO defects 
      (title, description, project_id, status, priority, reported_by, assigned_to, 
       steps_to_reproduce, expected_result, actual_result, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      title, 
      description, 
      project_id, 
      status || 'новый', 
      priority || 'средний', 
      reported_by || req.user.id,
      assigned_to || null,
      steps_to_reproduce || '',
      expected_result || '',
      actual_result || '',
      location || ''
    ]);
    
    const defect = result.rows[0];
    
    // Загружаем дополнительные данные
    // 1. Информация о проекте
    const projectResult = await db.query('SELECT id, name FROM projects WHERE id = $1', [defect.project_id]);
    
    // 2. Информация об авторе
    const reporterResult = await db.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1', 
      [defect.reported_by]
    );
    
    // 3. Информация о назначенном пользователе (если есть)
    let assignedToResult = { rows: [] };
    if (defect.assigned_to) {
      assignedToResult = await db.query(
        'SELECT id, first_name, last_name FROM users WHERE id = $1', 
        [defect.assigned_to]
      );
    }
    
    // Формируем ответ с полными данными
    const responseDefect = {
      ...defect,
      project: projectResult.rows.length > 0 ? projectResult.rows[0] : null,
      reporter: reporterResult.rows.length > 0 ? reporterResult.rows[0] : null,
      assigned_to: assignedToResult.rows.length > 0 ? assignedToResult.rows[0] : null
    };
    
    res.status(201).json({
      success: true,
      message: 'Дефект успешно создан',
      defect: responseDefect
    });
    
  } catch (error) {
    console.error('Ошибка при создании дефекта:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера при создании дефекта'
    });
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
  
  // Исправляем имена полей - заменяем camelCase на snake_case
  body('stage_id')  // Было stageId
    .optional()
    .isInt().withMessage('ID этапа должен быть целым числом'),
  
  body('assigned_to')  // Было assignedTo
    .optional()
    .isInt().withMessage('ID исполнителя должен быть целым числом'),
  
  body('location')
    .optional()
    .trim(),
  
  body('due_date')  // Было dueDate
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
      stage_id,     // Было stageId
      assigned_to,  // Было assignedTo
      location, 
      due_date      // Было dueDate
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
    
    // Обновляем проверку для stage_id
    if (stage_id !== undefined && stage_id !== currentDefect.stage_id) {
      // Проверка существования этапа и принадлежности к тому же проекту
      if (stage_id) {
        const stageExists = await db.query(
          'SELECT * FROM project_stages WHERE id = $1 AND project_id = $2',
          [stage_id, currentDefect.project_id]
        );
        
        if (stageExists.rows.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Этап не найден или не принадлежит проекту дефекта' 
          });
        }
      }
      
      queryParams.push(stage_id);
      updateFields.push(`stage_id = $${queryParams.length}`);
      historyRecords.push({
        field: 'stage_id',
        oldValue: currentDefect.stage_id,
        newValue: stage_id
      });
    }
    
    // Обновляем проверку для assigned_to
    if (assigned_to !== undefined && assigned_to !== currentDefect.assigned_to) {
      // Проверка существования пользователя, если задан
      if (assigned_to) {
        const userExists = await db.query('SELECT * FROM users WHERE id = $1', [assigned_to]);
        
        if (userExists.rows.length === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Указанный пользователь не найден' 
          });
        }
      }
      
      queryParams.push(assigned_to);
      updateFields.push(`assigned_to = $${queryParams.length}`);
      historyRecords.push({
        field: 'assigned_to',
        oldValue: currentDefect.assigned_to,
        newValue: assigned_to
      });
    }
    
    // Обновляем проверку для due_date
    if (due_date !== undefined && due_date !== currentDefect.due_date) {
      queryParams.push(due_date);
      updateFields.push(`due_date = $${queryParams.length}`);
      historyRecords.push({
        field: 'due_date',
        oldValue: currentDefect.due_date,
        newValue: due_date
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

// Получение списка вложений для дефекта
router.get('/:id/attachments', [
  authMiddleware,
  param('id').isInt().withMessage('ID дефекта должно быть целым числом')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors: errors.array()
      });
    }

    const defectId = parseInt(req.params.id);
    
    // Проверяем существование дефекта
    const defectExists = await db.query('SELECT * FROM defects WHERE id = $1', [defectId]);
    
    if (defectExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Дефект не найден'
      });
    }

    // Получаем список вложений для дефекта
    const result = await db.query(`
      SELECT a.*, u.first_name, u.last_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.defect_id = $1
      ORDER BY a.created_at DESC
    `, [defectId]);

    res.json({
      success: true,
      attachments: result.rows
    });
  } catch (error) {
    console.error('Ошибка при получении вложений дефекта:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера при получении вложений'
    });
  }
});

// Добавить перенаправление комментариев (если это еще не сделано)

const commentsRouter = require('./comments');

// Использовать маршрутизатор комментариев для обработки соответствующих запросов
router.use('/', commentsRouter);

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

// Настройка хранилища для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Создаем папку с текущим годом-месяцем для организации файлов
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const dir = path.join(process.env.UPLOAD_PATH || './uploads', `${year}-${month}`);
    
    // Создаем папку, если она не существует
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, uniqueSuffix + fileExt);
  }
});

// Фильтрация файлов по типу
const fileFilter = (req, file, cb) => {
  // Разрешенные типы файлов
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый тип файла. Разрешены только изображения, PDF, документы Word/Excel и текстовые файлы.'), false);
  }
};

// Настройка загрузчика
const upload = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB максимальный размер
    files: 5 // максимум 5 файлов
  } 
});

// Маршрут для загрузки вложений к дефекту
router.post('/:id/attachments', [
  authMiddleware,
  param('id').isInt().withMessage('ID дефекта должно быть целым числом')
], upload.array('files'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Удаляем загруженные файлы в случае ошибки
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors: errors.array()
      });
    }

    const defectId = parseInt(req.params.id);
    const userId = req.user.id;
    
    // Проверяем существование дефекта
    const defectExists = await db.query('SELECT * FROM defects WHERE id = $1', [defectId]);
    
    if (defectExists.rows.length === 0) {
      // Удаляем загруженные файлы
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Дефект не найден'
      });
    }

    // Если файлы не были загружены
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Не выбраны файлы для загрузки'
      });
    }

    // Сохраняем информацию о вложениях в базу данных
    const savedAttachments = [];
    
    for (const file of req.files) {
      const result = await db.query(`
        INSERT INTO attachments 
        (defect_id, file_name, file_path, file_type, file_size, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        defectId,
        file.originalname,
        file.path,
        file.mimetype,
        file.size,
        userId
      ]);
      
      savedAttachments.push(result.rows[0]);
    }

    res.status(201).json({
      success: true,
      message: 'Файлы успешно загружены',
      attachments: savedAttachments
    });
  } catch (error) {
    // Удаляем загруженные файлы в случае ошибки
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    console.error('Ошибка при загрузке вложений:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера при загрузке файлов'
    });
  }
});

module.exports = router;