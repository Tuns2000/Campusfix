const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware для проверки JWT токена
 */
const authMiddleware = (req, res, next) => {
  // Получаем токен из заголовка
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      message: 'Доступ запрещен. Токен не предоставлен.' 
    });
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ 
      success: false, 
      message: 'Неверный формат токена.' 
    });
  }
  
  const token = parts[1];
  
  try {
    // Верифицируем токен
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Добавляем информацию о пользователе в объект запроса
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      firstName: decoded.firstName,
      lastName: decoded.lastName
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Срок действия токена истек. Пожалуйста, авторизуйтесь заново.' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Недействительный токен.' 
    });
  }
};

module.exports = authMiddleware;