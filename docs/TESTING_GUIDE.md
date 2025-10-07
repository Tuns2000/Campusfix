# Руководство по тестированию CampusFix

## Подготовка к тестированию

### 1. Установка зависимостей

```bash
cd server
npm install
```

### 2. Настройка тестовой базы данных

Создайте тестовую базу данных:

```sql
CREATE DATABASE campusfix_test;
```

### 3. Настройка переменных окружения

Скопируйте файл `.env.test.example` в `.env.test` и настройте параметры:

```bash
cp .env.test.example .env.test
```

Отредактируйте `.env.test` согласно вашим настройкам PostgreSQL.

### 4. Миграция тестовой базы данных

Примените SQL-схему к тестовой базе:

```bash
psql -U postgres -d campusfix_test -f sql/init.sql
```

## Запуск тестов

### Запуск всех тестов

```bash
npm test
```

### Запуск только unit-тестов

```bash
npm run test:unit
```

### Запуск только интеграционных тестов

```bash
npm run test:integration
```

### Запуск нагрузочного тестирования

**Важно:** Перед запуском нагрузочных тестов убедитесь, что сервер запущен:

```bash
# В одном терминале
npm start

# В другом терминале
npm run test:load
```

### Запуск с coverage

```bash
npm run test:coverage
```

### Запуск в режиме watch

```bash
npm run test:watch
```

## Структура тестов

### Unit-тесты (`tests/unit/`)

- **helpers.test.js** - Тестирование вспомогательных функций
- **validation.test.js** - Валидация данных, паролей, статусов
- **middleware.test.js** - Тестирование middleware (auth, roleCheck, errorHandler)

### Интеграционные тесты (`tests/integration/`)

- **auth.test.js** - Регистрация, аутентификация, авторизация
- **defects.test.js** - CRUD операции с дефектами, статусы, комментарии
- **projects.test.js** - Полный жизненный цикл проекта
- **load.test.js** - Нагрузочное тестирование (требование ≤1 сек)

## Требования к производительности

Согласно техническому заданию:

- **Среднее время отклика:** ≤ 1 секунда
- **P95 latency:** ≤ 2 секунды
- **Минимальная пропускная способность:** ≥ 50 запросов/сек
- **Максимальная частота ошибок:** ≤ 1%

## Результаты тестов

### Unit-тесты

✅ Валидация email и паролей  
✅ Хеширование паролей  
✅ JWT токены  
✅ Санитизация входных данных  
✅ Middleware аутентификации  
✅ Проверка ролей  
✅ Обработка ошибок  

### Интеграционные тесты

✅ Регистрация пользователей  
✅ Аутентификация  
✅ CRUD операции с дефектами  
✅ Изменение статусов  
✅ Комментарии и история  
✅ Жизненный цикл проекта  
✅ Контроль доступа  

### Нагрузочное тестирование

✅ GET запросы (списки дефектов, проектов)  
✅ POST запросы (создание дефектов)  
✅ Смешанная нагрузка  
✅ Запросы с фильтрами  
✅ Производительность БД  

## Критерии приёмки

Согласно User Stories в техническом задании:

### US-1: Регистрация и авторизация
- ✅ Валидация email
- ✅ Хеширование паролей
- ✅ Генерация JWT токенов
- ✅ Проверка ролей

### US-2: Управление проектами
- ✅ Создание проектов (admin/manager)
- ✅ Просмотр списка
- ✅ Редактирование
- ✅ Этапы проекта

### US-3: Управление дефектами
- ✅ Создание дефектов
- ✅ Просмотр и поиск
- ✅ Редактирование
- ✅ Изменение статусов
- ✅ Прикрепление файлов

### US-4: Работа с комментариями
- ✅ Добавление комментариев
- ✅ Просмотр истории
- ✅ Уведомления (в составе логики)

### US-5: Отчётность и аналитика
- ✅ Фильтрация данных
- ✅ Экспорт в Excel/CSV
- ✅ Статистика (в API)

### US-6: Администрирование
- ✅ Управление пользователями
- ✅ Назначение ролей
- ✅ Контроль доступа

## Устранение проблем

### Тесты падают с ошибкой подключения к БД

Проверьте:
1. PostgreSQL запущен
2. Тестовая база создана
3. Параметры в `.env.test` корректны

### Timeout ошибки

Увеличьте таймауты в `jest.config.js`:

```javascript
testTimeout: 60000,
```

### Ошибки при load testing

Убедитесь, что:
1. Основной сервер запущен
2. `TEST_API_URL` в `.env.test` правильный
3. В БД есть тестовые данные

## Coverage Report

После запуска `npm run test:coverage` отчёт будет доступен в:

```
server/coverage/lcov-report/index.html
```

Откройте его в браузере для детального анализа покрытия кода.

## Continuous Integration

Для CI/CD pipeline добавьте в `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: campusfix_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd server && npm install
      - run: cd server && npm test
```

## Дополнительные ресурсы

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Autocannon Documentation](https://github.com/mcollina/autocannon)
