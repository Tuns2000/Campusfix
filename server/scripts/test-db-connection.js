require('dotenv').config();
const { Pool } = require('pg');
const config = require('../src/config');

async function testConnection() {
  console.log('Тестирование подключения к базе данных...');
  console.log('Настройки:', {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    // пароль скрыт для безопасности
  });

  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password
  });

  try {
    // Проверяем соединение с базой данных
    const client = await pool.connect();
    console.log('✅ Соединение с базой данных успешно установлено!');

    // Выполняем тестовый запрос для проверки работоспособности
    const result = await client.query('SELECT current_timestamp');
    console.log('✅ Тестовый запрос выполнен успешно!');
    console.log('Текущее время сервера БД:', result.rows[0].current_timestamp);

    // Проверяем, существует ли база данных campusfix
    const dbCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_database WHERE datname = '${config.database.database}'
      )
    `);
    
    if (dbCheckResult.rows[0].exists) {
      console.log(`✅ База данных '${config.database.database}' существует!`);
    } else {
      console.log(`❌ База данных '${config.database.database}' не существует!`);
      console.log(`Выполните команду: createdb ${config.database.database}`);
    }

    client.release();
  } catch (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.log('⚠️ Проверьте, что сервер PostgreSQL запущен.');
    } else if (err.code === '3D000') {
      console.log(`⚠️ База данных '${config.database.database}' не существует.`);
      console.log(`Выполните команду: createdb ${config.database.database}`);
    } else if (err.code === '28P01') {
      console.log('⚠️ Неверное имя пользователя или пароль.');
    }
  } finally {
    await pool.end();
    console.log('Тестирование подключения завершено.');
  }
}

testConnection();