/**
 * Централизованный обработчик ошибок
 */
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  // Проверяем тип ошибки и формируем соответствующий ответ
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors: err.errors
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Доступ запрещен'
    });
  }
  
  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      success: false,
      message: 'Недостаточно прав для выполнения операции'
    });
  }
  
  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      message: err.message || 'Ресурс не найден'
    });
  }
  
  // Для всех остальных ошибок отправляем статус 500
  return res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера'
  });
};

module.exports = errorHandler;