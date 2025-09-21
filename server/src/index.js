const express = require('express');
const cors = require('cors');
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
app.use(cors({ origin: config.server.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка статических файлов для загрузок
app.use('/uploads', express.static(uploadsDir));

// Базовый маршрут для проверки работы API
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Подключаем маршруты API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
// Маршруты для этапов проектов (вложенные в /api/projects)
app.use('/api/projects', require('./routes/projectStages'));
app.use('/api/defects', require('./routes/defects'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/attachments', require('./routes/attachments'));

// Обработка ошибок
app.use(errorHandler);

// Запуск сервера
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Для тестирования