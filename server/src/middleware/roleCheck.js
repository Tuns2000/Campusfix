/**
 * Middleware для проверки роли пользователя
 * @param {string[]} roles - Массив допустимых ролей
 * @returns {function} Middleware-функция
 */
const roleCheck = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Требуется авторизация' 
      });
    }
    
    const hasRole = roles.includes(req.user.role);
    
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав для выполнения этого действия'
      });
    }
    
    next();
  };
};

module.exports = roleCheck;