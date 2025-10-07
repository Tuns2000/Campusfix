const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // Добавляем импорт модуля cors
const config = require('./config');
const multer = require('multer');

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

// Настройка CORS с более подробными параметрами
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Разрешенные источники (добавьте свои)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length']
};

app.use(cors(corsOptions));

// Отключаем часть middleware для некоторых маршрутов
app.use((req, res, next) => {
  // Отключаем helmet для маршрутов превью
  if (req.path.includes('/attachments/') && req.path.includes('/preview')) {
    // Установка заголовков для безопасного отображения содержимого
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  }
  next();
});

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
app.use('/api/reports', require('./routes/reports'));

// Обработка ошибок
app.use(errorHandler);

// Обработчик ошибок для multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = 'Ошибка при загрузке файла';
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Размер файла превышает допустимый (10 МБ)';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Превышено максимальное количество файлов (5)';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Неожиданное имя поля для файла';
    }
    
    return res.status(400).json({
      success: false,
      message,
      error: err.code
    });
  }
  
  if (err.message.includes('Неподдерживаемый тип файла')) {
    return res.status(400).json({
      success: false,
      message: err.message,
      error: 'UNSUPPORTED_FILE_TYPE'
    });
  }
  
  next(err);
});

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