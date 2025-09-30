const express = require('express');
const { query, param, validationResult } = require('express-validator');
const ExcelJS = require('exceljs');
const { stringify } = require('csv-stringify/sync');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// Применяем middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

/**
 * @route GET /api/reports/defects/status
 * @desc Получение статистики по статусам дефектов
 * @access Private (авторизованные пользователи)
 */
router.get('/defects/status', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    
    let queryText = `
      SELECT 
        status, 
        COUNT(*) as count 
      FROM 
        defects 
    `;
    
    const queryParams = [];
    
    if (projectId) {
      queryText += ' WHERE project_id = $1';
      queryParams.push(projectId);
    }
    
    queryText += ' GROUP BY status ORDER BY status';
    
    const result = await db.query(queryText, queryParams);
    
    // Если нет данных, возвращаем пустой массив
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/reports/defects/priority
 * @desc Получение статистики по приоритетам дефектов
 * @access Private (авторизованные пользователи)
 */
router.get('/defects/priority', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    
    let queryText = `
      SELECT 
        priority, 
        COUNT(*) as count 
      FROM 
        defects 
    `;
    
    const queryParams = [];
    
    if (projectId) {
      queryText += ' WHERE project_id = $1';
      queryParams.push(projectId);
    }
    
    queryText += ' GROUP BY priority ORDER BY priority';
    
    const result = await db.query(queryText, queryParams);
    
    // Если нет данных, возвращаем пустой массив
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/reports/projects/summary
 * @desc Получение сводки по проектам и дефектам
 * @access Private (авторизованные пользователи)
 */
router.get('/projects/summary', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id as project_id,
        p.name as project_name,
        COUNT(d.id) as total_defects,
        SUM(CASE WHEN d.status = 'новый' THEN 1 ELSE 0 END) as new_defects,
        SUM(CASE WHEN d.status = 'подтвержден' THEN 1 ELSE 0 END) as confirmed_defects,
        SUM(CASE WHEN d.status = 'в работе' THEN 1 ELSE 0 END) as in_progress_defects,
        SUM(CASE WHEN d.status = 'исправлен' THEN 1 ELSE 0 END) as fixed_defects,
        SUM(CASE WHEN d.status = 'проверен' THEN 1 ELSE 0 END) as verified_defects,
        SUM(CASE WHEN d.status = 'закрыт' THEN 1 ELSE 0 END) as closed_defects,
        SUM(CASE WHEN d.status = 'отклонен' THEN 1 ELSE 0 END) as rejected_defects,
        SUM(CASE WHEN d.priority = 'критический' THEN 1 ELSE 0 END) as critical_defects,
        SUM(CASE WHEN d.priority = 'высокий' THEN 1 ELSE 0 END) as high_defects,
        SUM(CASE WHEN d.priority = 'средний' THEN 1 ELSE 0 END) as medium_defects,
        SUM(CASE WHEN d.priority = 'низкий' THEN 1 ELSE 0 END) as low_defects
      FROM 
        projects p
      LEFT JOIN 
        defects d ON p.id = d.project_id
      GROUP BY 
        p.id, p.name
      ORDER BY 
        p.name
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/reports/users/performance
 * @desc Получение отчета по продуктивности пользователей
 * @access Private (admin, manager)
 */
router.get('/users/performance', roleCheck(['admin', 'manager']), async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id as user_id,
        u.first_name || ' ' || u.last_name as user_name,
        u.role,
        COUNT(d.id) as assigned_defects,
        SUM(CASE WHEN d.status = 'закрыт' THEN 1 ELSE 0 END) as closed_defects,
        COUNT(DISTINCT d.project_id) as projects_count,
        AVG(EXTRACT(EPOCH FROM (d.closed_at - d.updated_at)) / 86400) as avg_resolution_days
      FROM 
        users u
      LEFT JOIN 
        defects d ON u.id = d.assigned_to
      WHERE 
        u.role IN ('engineer', 'manager')
      GROUP BY 
        u.id, u.first_name, u.last_name, u.role
      ORDER BY 
        closed_defects DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/reports/export/defects
 * @desc Экспорт списка дефектов в CSV или Excel
 * @access Private (авторизованные пользователи)
 */
router.get('/export/defects', [
  query('format')
    .isIn(['csv', 'excel']).withMessage('Формат должен быть csv или excel'),
  query('projectId')
    .optional()
    .isInt().withMessage('ID проекта должен быть целым числом')
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
    
    const { format, projectId, status } = req.query;
    
    // Формирование запроса
    let queryText = `
      SELECT 
        d.id,
        d.title,
        d.description,
        d.status,
        d.priority,
        p.name as project_name,
        ps.name as stage_name,
        u1.first_name || ' ' || u1.last_name as reported_by_name,
        u2.first_name || ' ' || u2.last_name as assigned_to_name,
        d.location,
        d.due_date,
        d.created_at,
        d.updated_at,
        d.closed_at
      FROM 
        defects d
      LEFT JOIN 
        projects p ON d.project_id = p.id
      LEFT JOIN 
        project_stages ps ON d.stage_id = ps.id
      LEFT JOIN 
        users u1 ON d.reported_by = u1.id
      LEFT JOIN 
        users u2 ON d.assigned_to = u2.id
    `;
    
    const queryParams = [];
    const conditions = [];
    
    if (projectId) {
      queryParams.push(projectId);
      conditions.push(`d.project_id = $${queryParams.length}`);
    }
    
    if (status) {
      queryParams.push(status);
      conditions.push(`d.status = $${queryParams.length}`);
    }
    
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    
    queryText += ' ORDER BY d.created_at DESC';
    
    const result = await db.query(queryText, queryParams);
    
    // Если формат CSV
    if (format === 'csv') {
      // Преобразование данных для CSV
      const csvData = result.rows.map(row => ({
        ID: row.id,
        Название: row.title,
        Описание: row.description,
        Статус: row.status,
        Приоритет: row.priority,
        Проект: row.project_name,
        Этап: row.stage_name || '',
        Автор: row.reported_by_name,
        Исполнитель: row.assigned_to_name || '',
        Местоположение: row.location || '',
        Срок: row.due_date ? new Date(row.due_date).toLocaleDateString() : '',
        'Дата создания': new Date(row.created_at).toLocaleDateString(),
        'Дата обновления': new Date(row.updated_at).toLocaleDateString(),
        'Дата закрытия': row.closed_at ? new Date(row.closed_at).toLocaleDateString() : ''
      }));
      
      // Генерация CSV
      const csvOutput = stringify(csvData, { header: true, delimiter: ';' });
      
      // Отправка файла
      res.setHeader('Content-Disposition', `attachment; filename=defects-${new Date().toISOString().slice(0, 10)}.csv`);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csvOutput);
    }
    
    // Если формат Excel
    if (format === 'excel') {
      // Создание Excel файла
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Дефекты');
      
      // Определение колонок
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Название', key: 'title', width: 30 },
        { header: 'Описание', key: 'description', width: 50 },
        { header: 'Статус', key: 'status', width: 15 },
        { header: 'Приоритет', key: 'priority', width: 15 },
        { header: 'Проект', key: 'project_name', width: 20 },
        { header: 'Этап', key: 'stage_name', width: 20 },
        { header: 'Автор', key: 'reported_by_name', width: 20 },
        { header: 'Исполнитель', key: 'assigned_to_name', width: 20 },
        { header: 'Местоположение', key: 'location', width: 20 },
        { header: 'Срок', key: 'due_date', width: 15 },
        { header: 'Дата создания', key: 'created_at', width: 15 },
        { header: 'Дата обновления', key: 'updated_at', width: 15 },
        { header: 'Дата закрытия', key: 'closed_at', width: 15 }
      ];
      
      // Применение стилей к заголовкам
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Добавление данных
      result.rows.forEach(row => {
        worksheet.addRow({
          id: row.id,
          title: row.title,
          description: row.description,
          status: row.status,
          priority: row.priority,
          project_name: row.project_name,
          stage_name: row.stage_name,
          reported_by_name: row.reported_by_name,
          assigned_to_name: row.assigned_to_name,
          location: row.location,
          due_date: row.due_date ? new Date(row.due_date) : null,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
          closed_at: row.closed_at ? new Date(row.closed_at) : null
        });
      });
      
      // Применение стилей к датам
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Пропускаем заголовок
          ['due_date', 'created_at', 'updated_at', 'closed_at'].forEach(key => {
            const cell = row.getCell(key);
            if (cell.value) {
              cell.numFmt = 'dd.mm.yyyy';
            }
          });
        }
      });
      
      // Отправка файла
      res.setHeader('Content-Disposition', `attachment; filename=defects-${new Date().toISOString().slice(0, 10)}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Запись в буфер и отправка
      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);
    }
    
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/reports/export/project/:projectId
 * @desc Экспорт отчета о проекте в CSV или Excel
 * @access Private (авторизованные пользователи)
 */
router.get('/export/project/:projectId', [
  param('projectId').isInt().withMessage('ID проекта должен быть целым числом'),
  query('format')
    .isIn(['csv', 'excel']).withMessage('Формат должен быть csv или excel')
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
    const { format } = req.query;
    
    // Получение информации о проекте
    const projectResult = await db.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Проект не найден' 
      });
    }
    
    const project = projectResult.rows[0];
    
    // Получение информации о этапах проекта
    const stagesResult = await db.query(
      'SELECT * FROM project_stages WHERE project_id = $1 ORDER BY start_date',
      [projectId]
    );
    
    // Получение информации о дефектах проекта
    const defectsResult = await db.query(`
      SELECT 
        d.*,
        ps.name as stage_name,
        u1.first_name || ' ' || u1.last_name as reported_by_name,
        u2.first_name || ' ' || u2.last_name as assigned_to_name
      FROM 
        defects d
      LEFT JOIN 
        project_stages ps ON d.stage_id = ps.id
      LEFT JOIN 
        users u1 ON d.reported_by = u1.id
      LEFT JOIN 
        users u2 ON d.assigned_to = u2.id
      WHERE 
        d.project_id = $1
      ORDER BY 
        d.created_at DESC
    `, [projectId]);
    
    // Формирование отчета в зависимости от формата
    if (format === 'csv') {
      // Создание CSV для проекта
      const projectCsv = [
        {
          ID: project.id,
          Название: project.name,
          Описание: project.description || '',
          'Дата создания': new Date(project.created_at).toLocaleDateString(),
          'Дата обновления': new Date(project.updated_at).toLocaleDateString(),
          'Всего этапов': stagesResult.rows.length,
          'Всего дефектов': defectsResult.rows.length,
          'Открытых дефектов': defectsResult.rows.filter(d => d.status !== 'закрыт' && d.status !== 'отклонен').length,
          'Закрытых дефектов': defectsResult.rows.filter(d => d.status === 'закрыт' || d.status === 'отклонен').length
        }
      ];
      
      // Создание CSV для этапов
      const stagesCsv = stagesResult.rows.map(stage => ({
        ID: stage.id,
        Название: stage.name,
        Описание: stage.description || '',
        Статус: stage.status,
        'Дата начала': new Date(stage.start_date).toLocaleDateString(),
        'Дата окончания': stage.end_date ? new Date(stage.end_date).toLocaleDateString() : '',
        'Дата создания': new Date(stage.created_at).toLocaleDateString(),
        'Дата обновления': new Date(stage.updated_at).toLocaleDateString()
      }));
      
      // Создание CSV для дефектов
      const defectsCsv = defectsResult.rows.map(defect => ({
        ID: defect.id,
        Название: defect.title,
        Описание: defect.description || '',
        Статус: defect.status,
        Приоритет: defect.priority,
        Этап: defect.stage_name || '',
        Автор: defect.reported_by_name,
        Исполнитель: defect.assigned_to_name || '',
        Местоположение: defect.location || '',
        Срок: defect.due_date ? new Date(defect.due_date).toLocaleDateString() : '',
        'Дата создания': new Date(defect.created_at).toLocaleDateString(),
        'Дата обновления': new Date(defect.updated_at).toLocaleDateString(),
        'Дата закрытия': defect.closed_at ? new Date(defect.closed_at).toLocaleDateString() : ''
      }));
      
      // Объединение данных в один CSV
      let csvOutput = '';
      csvOutput += 'Отчет о проекте\n';
      csvOutput += stringify(projectCsv, { header: true, delimiter: ';' });
      csvOutput += '\n\nЭтапы проекта\n';
      csvOutput += stringify(stagesCsv, { header: true, delimiter: ';' });
      csvOutput += '\n\nДефекты проекта\n';
      csvOutput += stringify(defectsCsv, { header: true, delimiter: ';' });
      
      // Отправка файла
      res.setHeader('Content-Disposition', `attachment; filename=project-${projectId}-${new Date().toISOString().slice(0, 10)}.csv`);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csvOutput);
    }
    
    // Если формат Excel
    if (format === 'excel') {
      // Создание Excel файла
      const workbook = new ExcelJS.Workbook();
      
      // Лист с информацией о проекте
      const projectSheet = workbook.addWorksheet('Проект');
      projectSheet.columns = [
        { header: 'Поле', key: 'field', width: 20 },
        { header: 'Значение', key: 'value', width: 50 }
      ];
      
      // Добавление данных о проекте
      projectSheet.addRow({ field: 'ID', value: project.id });
      projectSheet.addRow({ field: 'Название', value: project.name });
      projectSheet.addRow({ field: 'Описание', value: project.description || '' });
      projectSheet.addRow({ field: 'Дата создания', value: new Date(project.created_at) });
      projectSheet.addRow({ field: 'Дата обновления', value: new Date(project.updated_at) });
      projectSheet.addRow({ field: 'Всего этапов', value: stagesResult.rows.length });
      projectSheet.addRow({ field: 'Всего дефектов', value: defectsResult.rows.length });
      projectSheet.addRow({ 
        field: 'Открытых дефектов', 
        value: defectsResult.rows.filter(d => d.status !== 'закрыт' && d.status !== 'отклонен').length 
      });
      projectSheet.addRow({ 
        field: 'Закрытых дефектов', 
        value: defectsResult.rows.filter(d => d.status === 'закрыт' || d.status === 'отклонен').length 
      });
      
      // Применение стилей
      projectSheet.getColumn('field').font = { bold: true };
      projectSheet.getRow(1).font = { bold: true };
      projectSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Лист с этапами проекта
      const stagesSheet = workbook.addWorksheet('Этапы');
      stagesSheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Название', key: 'name', width: 30 },
        { header: 'Описание', key: 'description', width: 50 },
        { header: 'Статус', key: 'status', width: 15 },
        { header: 'Дата начала', key: 'start_date', width: 15 },
        { header: 'Дата окончания', key: 'end_date', width: 15 },
        { header: 'Дата создания', key: 'created_at', width: 15 },
        { header: 'Дата обновления', key: 'updated_at', width: 15 }
      ];
      
      // Применение стилей к заголовкам
      stagesSheet.getRow(1).font = { bold: true };
      stagesSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Добавление данных об этапах
      stagesResult.rows.forEach(stage => {
        stagesSheet.addRow({
          id: stage.id,
          name: stage.name,
          description: stage.description || '',
          status: stage.status,
          start_date: new Date(stage.start_date),
          end_date: stage.end_date ? new Date(stage.end_date) : null,
          created_at: new Date(stage.created_at),
          updated_at: new Date(stage.updated_at)
        });
      });
      
      // Лист с дефектами проекта
      const defectsSheet = workbook.addWorksheet('Дефекты');
      defectsSheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Название', key: 'title', width: 30 },
        { header: 'Описание', key: 'description', width: 50 },
        { header: 'Статус', key: 'status', width: 15 },
        { header: 'Приоритет', key: 'priority', width: 15 },
        { header: 'Этап', key: 'stage_name', width: 20 },
        { header: 'Автор', key: 'reported_by_name', width: 20 },
        { header: 'Исполнитель', key: 'assigned_to_name', width: 20 },
        { header: 'Местоположение', key: 'location', width: 20 },
        { header: 'Срок', key: 'due_date', width: 15 },
        { header: 'Дата создания', key: 'created_at', width: 15 },
        { header: 'Дата обновления', key: 'updated_at', width: 15 },
        { header: 'Дата закрытия', key: 'closed_at', width: 15 }
      ];
      
      // Применение стилей к заголовкам
      defectsSheet.getRow(1).font = { bold: true };
      defectsSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Добавление данных о дефектах
      defectsResult.rows.forEach(defect => {
        defectsSheet.addRow({
          id: defect.id,
          title: defect.title,
          description: defect.description || '',
          status: defect.status,
          priority: defect.priority,
          stage_name: defect.stage_name || '',
          reported_by_name: defect.reported_by_name,
          assigned_to_name: defect.assigned_to_name || '',
          location: defect.location || '',
          due_date: defect.due_date ? new Date(defect.due_date) : null,
          created_at: new Date(defect.created_at),
          updated_at: new Date(defect.updated_at),
          closed_at: defect.closed_at ? new Date(defect.closed_at) : null
        });
      });
      
      // Применение форматирования дат
      [stagesSheet, defectsSheet].forEach(sheet => {
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) { // Пропускаем заголовок
            row.eachCell((cell, colNumber) => {
              if (cell.value instanceof Date) {
                cell.numFmt = 'dd.mm.yyyy';
              }
            });
          }
        });
      });
      
      // Отправка файла
      res.setHeader('Content-Disposition', `attachment; filename=project-${projectId}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Запись в буфер и отправка
      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);
    }
    
  } catch (err) {
    next(err);
  }
});

module.exports = router;