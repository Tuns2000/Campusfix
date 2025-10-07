// Setup file для Jest тестов
require('dotenv').config({ path: '.env.test' });

// Мокаем logger для тестов
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Устанавливаем таймауты
jest.setTimeout(30000);

// Глобальная очистка после всех тестов
afterAll(async () => {
  // Даём время на завершение соединений
  await new Promise(resolve => setTimeout(resolve, 500));
});
