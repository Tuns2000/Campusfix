const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { param, validationResult } = require('express-validator');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');

// Получение вложения для скачивания
router.get('/:id', [
  authMiddleware,
  param('id').isInt().withMessage('ID вложения должно быть целым числом')
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

    const attachmentId = parseInt(req.params.id);
    
    // Получаем информацию о вложении из базы данных
    const result = await db.query('SELECT * FROM attachments WHERE id = $1', [attachmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Вложение не найдено'
      });
    }

    const attachment = result.rows[0];
    const filePath = path.resolve(attachment.file_path);

    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Файл не найден на сервере'
      });
    }

    // Отправляем файл клиенту
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.file_name)}"`);
    res.setHeader('Content-Type', attachment.file_type);
    
    // Отправляем файл
    res.sendFile(filePath);
  } catch (error) {
    console.error('Ошибка при скачивании вложения:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера при скачивании вложения'
    });
  }
});

// Получение вложения для предпросмотра - убираем middleware авторизации
router.get('/:id/preview', [
  param('id').isInt().withMessage('ID вложения должно быть целым числом')
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

    const attachmentId = parseInt(req.params.id);
    
    // Получаем информацию о вложении из базы данных
    const result = await db.query('SELECT * FROM attachments WHERE id = $1', [attachmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Вложение не найдено'
      });
    }

    const attachment = result.rows[0];
    const filePath = path.resolve(attachment.file_path);

    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Файл не найден на сервере'
      });
    }

    // Отправляем файл клиенту для предпросмотра (inline)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.file_name)}"`);
    res.setHeader('Content-Type', attachment.file_type);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Отправляем файл
    res.sendFile(filePath);
  } catch (error) {
    console.error('Ошибка при предпросмотре вложения:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера при предпросмотре вложения'
    });
  }
});

// Исправленный маршрут для удаления вложения
router.delete('/:id', [
  authMiddleware,
  param('id').isInt().withMessage('ID вложения должно быть целым числом')
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

    const attachmentId = parseInt(req.params.id);
    
    console.log(`Запрос на удаление вложения с ID: ${attachmentId}`);
    
    // Получаем информацию о вложении из базы данных
    const result = await db.query('SELECT * FROM attachments WHERE id = $1', [attachmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Вложение не найдено'
      });
    }

    const attachment = result.rows[0];
    
    // Проверка прав на удаление (администратор, менеджер или создатель)
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && attachment.uploaded_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав на удаление этого вложения'
      });
    }

    // Удаляем физический файл
    const filePath = path.resolve(attachment.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Удаляем запись из базы данных
    await db.query('DELETE FROM attachments WHERE id = $1', [attachmentId]);

    console.log(`Вложение с ID: ${attachmentId} успешно удалено`);

    res.json({
      success: true,
      message: 'Вложение успешно удалено'
    });
  } catch (error) {
    console.error('Ошибка при удалении вложения:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера при удалении вложения'
    });
  }
});

module.exports = router;