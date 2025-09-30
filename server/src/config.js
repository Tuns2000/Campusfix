require('dotenv').config();

const config = {
  // Настройки базы данных
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'campusfix',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'ArtemB1998',
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
    directory: process.env.UPLOADS_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB по умолчанию
    allowedTypes: [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ]
  },
  
  // Настройки логирования
  logging: {
    file: process.env.LOG_FILE || 'logs/server.log',
    level: process.env.LOG_LEVEL || 'info',
  },
};

module.exports = config;