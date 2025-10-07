const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware для проверки JWT токена
 */
const authMiddleware = (req, res, next) => {
  try {
    // Проверяем наличие токена в заголовке Authorization
    let token = req.headers.authorization;
    
    // Если токена нет в заголовке, проверяем URL-параметр
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }
    
    // Если токен все еще отсутствует, возвращаем ошибку
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Доступ запрещен. Токен отсутствует.'
      });
    }

    // Удаляем префикс 'Bearer ' если он есть
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    // Верифицируем токен
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Ошибка аутентификации:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Недействительный или истекший токен.'
    });
  }
};

module.exports = authMiddleware;