const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');
const Excel = require('exceljs');
const { stringify } = require('csv-stringify/sync');
const path = require('path');

// Применяем middleware аутентификации
router.use(authMiddleware);

/**
 * @route GET /api/reports/defects
 * @desc Экспорт отчета о дефектах в формате CSV или Excel
 * @access Private (все авторизованные пользователи)
 */
router.get('/defects', [
  query('format').isIn(['csv', 'excel']).withMessage('Формат должен быть csv или excel'),
  query('status').optional().isString(),
  query('priority').optional().isString(),
  query('project').optional().isInt(),
  query('startDate').optional().isDate(),
  query('endDate').optional().isDate(),
], async (req, res) => {
  try {
    // Валидация входных параметров
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации параметров',
        errors: errors.array()
      });
    }

    // Получаем параметры запроса
    const { format, status, priority, project, startDate, endDate } = req.query;

    // Строим базовый SQL запрос
    let query = `
      SELECT 
        d.id, d.title, d.description, d.status, d.priority, 
        d.location, d.created_at, d.updated_at, d.closed_at,
        p.name as project_name,
        u1.first_name || ' ' || u1.last_name as reported_by_name,
        u2.first_name || ' ' || u2.last_name as assigned_to_name
      FROM 
        defects d
      LEFT JOIN 
        projects p ON d.project_id = p.id
      LEFT JOIN 
        users u1 ON d.reported_by = u1.id
      LEFT JOIN 
        users u2 ON d.assigned_to = u2.id
      WHERE 1=1
    `;

    // Добавляем параметры фильтрации
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND d.status = $${params.length}`;
    }
    
    if (priority) {
      params.push(priority);
      query += ` AND d.priority = $${params.length}`;
    }
    
    if (project) {
      params.push(project);
      query += ` AND d.project_id = $${params.length}`;
    }
    
    if (startDate) {
      params.push(startDate);
      query += ` AND d.created_at >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND d.created_at <= $${params.length}`;
    }
    
    // Сортировка по дате создания
    query += ` ORDER BY d.created_at DESC`;
    
    // Получаем данные из БД
    const result = await db.query(query, params);
    const defects = result.rows;

    // Форматируем данные для экспорта
    const formattedData = defects.map(defect => ({
      ID: defect.id,
      Название: defect.title,
      Описание: defect.description?.substring(0, 100) || '',
      Проект: defect.project_name,
      Статус: defect.status,
      Приоритет: defect.priority,
      Локация: defect.location,
      'Создан': formatDate(defect.created_at),
      'Обновлен': formatDate(defect.updated_at),
      'Закрыт': defect.closed_at ? formatDate(defect.closed_at) : '-',
      'Создал': defect.reported_by_name,
      'Назначен': defect.assigned_to_name || '-'
    }));

    // Экспорт в зависимости от выбранного формата
    if (format === 'csv') {
      // Генерируем CSV
      const csvContent = stringify(formattedData, { 
        header: true,
        columns: {
          ID: 'ID',
          Название: 'Название', 
          Описание: 'Описание',
          Проект: 'Проект',
          Статус: 'Статус',
          Приоритет: 'Приоритет',
          Локация: 'Локация',
          'Создан': 'Создан',
          'Обновлен': 'Обновлен',
          'Закрыт': 'Закрыт',
          'Создал': 'Создал',
          'Назначен': 'Назначен'
        }
      });

      // Установка заголовков для скачивания
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=defects_report.csv');
      
      // Отправка файла
      return res.send(csvContent);

    } else if (format === 'excel') {
      // Создаем Excel файл
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Дефекты');

      // Определяем колонки
      worksheet.columns = [
        { header: 'ID', key: 'ID', width: 10 },
        { header: 'Название', key: 'Название', width: 30 },
        { header: 'Описание', key: 'Описание', width: 40 },
        { header: 'Проект', key: 'Проект', width: 20 },
        { header: 'Статус', key: 'Статус', width: 15 },
        { header: 'Приоритет', key: 'Приоритет', width: 15 },
        { header: 'Локация', key: 'Локация', width: 20 },
        { header: 'Создан', key: 'Создан', width: 20 },
        { header: 'Обновлен', key: 'Обновлен', width: 20 },
        { header: 'Закрыт', key: 'Закрыт', width: 20 },
        { header: 'Создал', key: 'Создал', width: 25 },
        { header: 'Назначен', key: 'Назначен', width: 25 }
      ];

      // Стилизация заголовков
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Добавляем данные
      worksheet.addRows(formattedData);

      // Установка заголовков для скачивания
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=defects_report.xlsx');
      
      // Отправляем файл
      return workbook.xlsx.write(res)
        .then(() => {
          res.status(200).end();
        });
    }
  } catch (error) {
    console.error('Ошибка при экспорте отчета:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании отчета'
    });
  }
});

/**
 * @route GET /api/reports/projects
 * @desc Экспорт отчета о проектах в формате CSV или Excel
 * @access Private (все авторизованные пользователи)
 */
router.get('/projects', [
  query('format').isIn(['csv', 'excel']).withMessage('Формат должен быть csv или excel'),
], async (req, res) => {
  try {
    // Валидация входных параметров
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации параметров',
        errors: errors.array()
      });
    }

    const { format } = req.query;

    // Получаем проекты с дополнительной статистикой
    const result = await db.query(`
      SELECT 
        p.*,
        COUNT(DISTINCT d.id) as total_defects,
        SUM(CASE WHEN d.status = 'закрыт' THEN 1 ELSE 0 END) as closed_defects,
        SUM(CASE WHEN d.status = 'в работе' THEN 1 ELSE 0 END) as in_progress_defects,
        SUM(CASE WHEN d.priority = 'высокий' OR d.priority = 'критический' THEN 1 ELSE 0 END) as high_priority_defects
      FROM 
        projects p
      LEFT JOIN 
        defects d ON p.id = d.project_id
      GROUP BY 
        p.id
      ORDER BY 
        p.name
    `);

    const projects = result.rows;

    // Форматируем данные для экспорта
    const formattedData = projects.map(project => ({
      ID: project.id,
      Название: project.name,
      Описание: project.description || '-',
      'Всего дефектов': project.total_defects || 0,
      'Закрытые дефекты': project.closed_defects || 0,
      'Дефекты в работе': project.in_progress_defects || 0,
      'Высокий приоритет': project.high_priority_defects || 0,
      'Создан': formatDate(project.created_at),
      'Обновлен': formatDate(project.updated_at)
    }));

    if (format === 'csv') {
      // Генерируем CSV
      const csvContent = stringify(formattedData, { header: true });

      // Установка заголовков для скачивания
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=projects_report.csv');
      
      // Отправка файла
      return res.send(csvContent);

    } else if (format === 'excel') {
      // Создаем Excel файл
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Проекты');

      // Определяем колонки
      worksheet.columns = [
        { header: 'ID', key: 'ID', width: 10 },
        { header: 'Название', key: 'Название', width: 30 },
        { header: 'Описание', key: 'Описание', width: 40 },
        { header: 'Всего дефектов', key: 'Всего дефектов', width: 15 },
        { header: 'Закрытые дефекты', key: 'Закрытые дефекты', width: 15 },
        { header: 'Дефекты в работе', key: 'Дефекты в работе', width: 15 },
        { header: 'Высокий приоритет', key: 'Высокий приоритет', width: 15 },
        { header: 'Создан', key: 'Создан', width: 20 },
        { header: 'Обновлен', key: 'Обновлен', width: 20 }
      ];

      // Стилизация заголовков
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Добавляем данные
      worksheet.addRows(formattedData);

      // Установка заголовков для скачивания
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=projects_report.xlsx');
      
      // Отправляем файл
      return workbook.xlsx.write(res)
        .then(() => {
          res.status(200).end();
        });
    }
  } catch (error) {
    console.error('Ошибка при экспорте отчета о проектах:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании отчета о проектах'
    });
  }
});

/**
 * Вспомогательная функция для форматирования даты
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU');
}

module.exports = router;