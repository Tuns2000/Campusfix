require('dotenv').config();

const config = {
  // Настройки базы данных
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'campusfix',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20, // максимальное количество соединений в пуле
    idleTimeoutMillis: 30000
  },
  
  // Настройки сервера
  server: {
    port: parseInt(process.env.PORT || '3001'),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },
  
  // Настройки JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-replace-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Настройки загрузки файлов
  uploads: {
    directory: process.env.UPLOAD_DIR || 'uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  
  // Настройки логирования
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/server.log'
  }
};

module.exports = config;