const jwt = require('jsonwebtoken');

/**
 * Валидация email адреса
 * @param {string} email - Email для проверки
 * @returns {boolean} - True если email валидный
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Валидация пароля
 * Требования: минимум 8 символов, содержит буквы и цифры
 * @param {string} password - Пароль для проверки
 * @returns {boolean} - True если пароль валидный
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }
  // Минимум 8 символов, содержит буквы и цифры
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Форматирование даты в DD.MM.YYYY
 * @param {Date|string} date - Дата для форматирования
 * @returns {string} - Отформатированная дата
 */
function formatDate(date) {
  if (!date) {
    return '';
  }
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return '';
    }
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch (error) {
    return '';
  }
}

/**
 * Санитизация входных данных
 * Удаляет HTML теги и опасные символы
 * @param {string} input - Строка для очистки
 * @returns {string} - Очищенная строка
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Удаляем HTML теги
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Убираем лишние пробелы
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Генерация JWT токена
 * @param {Object} payload - Данные для токена
 * @param {string} expiresIn - Время жизни токена (по умолчанию 24h)
 * @returns {string} - JWT токен
 */
function generateToken(payload, expiresIn = '24h') {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Валидация статуса дефекта
 * @param {string} status - Статус для проверки
 * @returns {boolean} - True если статус валидный
 */
function isValidDefectStatus(status) {
  const validStatuses = [
    'новый',
    'подтвержден',
    'в работе',
    'исправлен',
    'проверен',
    'закрыт',
    'отклонен'
  ];
  return validStatuses.includes(status);
}

/**
 * Валидация приоритета дефекта
 * @param {string} priority - Приоритет для проверки
 * @returns {boolean} - True если приоритет валидный
 */
function isValidDefectPriority(priority) {
  const validPriorities = ['низкий', 'средний', 'высокий', 'критический'];
  return validPriorities.includes(priority);
}

/**
 * Валидация роли пользователя
 * @param {string} role - Роль для проверки
 * @returns {boolean} - True если роль валидная
 */
function isValidUserRole(role) {
  const validRoles = ['admin', 'manager', 'engineer', 'observer'];
  return validRoles.includes(role);
}

/**
 * Получение инициалов из имени
 * @param {string} name - Полное имя
 * @returns {string} - Инициалы
 */
function getInitials(name) {
  if (!name) return '';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
}

/**
 * Пагинация результатов
 * @param {number} page - Номер страницы
 * @param {number} limit - Количество элементов на странице
 * @returns {Object} - Объект с offset и limit
 */
function getPagination(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  return { offset, limit };
}

module.exports = {
  validateEmail,
  validatePassword,
  formatDate,
  sanitizeInput,
  generateToken,
  isValidDefectStatus,
  isValidDefectPriority,
  isValidUserRole,
  getInitials,
  getPagination,
};
