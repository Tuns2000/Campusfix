const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Импорт middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Создаем директорию для загрузок, если она не существует
const uploadsDir = path.join(__dirname, '..', config.uploads.directory);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Создаем директорию для логов, если она не существует
const logsDir = path.dirname(path.join(__dirname, '..', config.logging.file));
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();

// Настройка промежуточного ПО
app.use(helmet()); // Защита заголовков HTTP
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка CORS
const cors = require('cors');
app.use(cors());

// Настройка статических файлов для загрузок
app.use('/uploads', express.static(path.join(__dirname, '..', config.uploads.directory)));

// Базовый маршрут для проверки работы API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Подключаем маршруты API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/project-stages', require('./routes/projectStages'));
app.use('/api/defects', require('./routes/defects'));
app.use('/api/attachments', require('./routes/attachments'));
// Добавляем маршрут для отчетов
app.use('/api/reports', require('./routes/reports'));

// Обработка ошибок
app.use(errorHandler);

// Запуск сервера
const PORT = config.server.port;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  try {
    // Импортируем и запускаем функцию исправления ограничения status
    const { fixStatusConstraint } = require('./utils/fixStatusConstraint');
    await fixStatusConstraint();
    
    // Существующий код проверки структуры БД
  } catch (error) {
    console.error('Ошибка при исправлении структуры БД:', error);
  }
});

module.exports = app; // Для тестирования