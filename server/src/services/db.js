const { Pool } = require('pg');
const config = require('../config');

// Создаем пул соединений с базой данных
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  max: config.database.max,
  idleTimeoutMillis: config.database.idleTimeoutMillis
});

// Обрабатываем события соединения
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

/**
 * Выполняет SQL-запрос к базе данных
 * @param {string} text - SQL-запрос
 * @param {Array} params - Параметры запроса
 * @returns {Promise} Результат запроса
 */
const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  
  console.log('Executed query', { text, duration, rows: result.rowCount });
  
  return result;
};

/**
 
 * @returns {Object} Клиент для выполнения транзакции
 */
const getClient = async () => {
  const client = await pool.connect();
  
  const query = client.query;
  const release = client.release;
  
  // Переопределяем метод выпуска для добавления логирования
  client.release = () => {
    client.query = query;
    client.release = release;
    return release.apply(client);
  };
  
  return client;
};

module.exports = {
  query,
  getClient
};