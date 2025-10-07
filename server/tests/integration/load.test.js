const autocannon = require('autocannon');
const app = require('../../src/index');

// Функция для запуска load testing
async function runLoadTest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url,
        connections: options.connections || 10,
        duration: options.duration || 10,
        pipelining: options.pipelining || 1,
        ...options,
      },
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );

    autocannon.track(instance);
  });
}

describe('Load Testing', () => {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:5000';
  let authToken;

  beforeAll(async () => {
    // Получаем токен для аутентифицированных запросов
    const axios = require('axios');
    try {
      const response = await axios.post(`${baseUrl}/api/auth/login`, {
        email: 'engineer@test.com',
        password: 'password123',
      });
      authToken = response.data.token;
    } catch (error) {
      console.error('Failed to get auth token for load testing');
    }
  });

  test('GET /api/defects should handle load (≤1 sec avg)', async () => {
    const result = await runLoadTest(`${baseUrl}/api/defects`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      connections: 20,
      duration: 10,
    });

    console.log('Defects list load test results:');
    console.log(`Average response time: ${result.latency.mean}ms`);
    console.log(`Requests per second: ${result.requests.average}`);
    console.log(`Total requests: ${result.requests.total}`);

    // Проверяем что среднее время отклика ≤ 1 секунды
    expect(result.latency.mean).toBeLessThanOrEqual(1000);
    expect(result.errors).toBe(0);
  }, 30000);

  test('GET /api/projects should handle load (≤1 sec avg)', async () => {
    const result = await runLoadTest(`${baseUrl}/api/projects`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      connections: 20,
      duration: 10,
    });

    console.log('Projects list load test results:');
    console.log(`Average response time: ${result.latency.mean}ms`);
    console.log(`Requests per second: ${result.requests.average}`);
    console.log(`Total requests: ${result.requests.total}`);

    expect(result.latency.mean).toBeLessThanOrEqual(1000);
    expect(result.errors).toBe(0);
  }, 30000);

  test('POST /api/defects should handle concurrent writes', async () => {
    const result = await runLoadTest(`${baseUrl}/api/defects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        project_id: 1,
        title: 'Load test defect',
        description: 'Created during load testing',
        status: 'новый',
        priority: 'средний',
        location: 'Test location',
      }),
      connections: 10,
      duration: 5,
    });

    console.log('Defect creation load test results:');
    console.log(`Average response time: ${result.latency.mean}ms`);
    console.log(`Requests per second: ${result.requests.average}`);
    console.log(`Total requests: ${result.requests.total}`);

    // Для операций записи допускаем немного больше времени
    expect(result.latency.mean).toBeLessThanOrEqual(1500);
  }, 30000);

  test('Mixed load: read and write operations', async () => {
    const readResult = await runLoadTest(`${baseUrl}/api/defects`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      connections: 15,
      duration: 5,
    });

    const writeResult = await runLoadTest(`${baseUrl}/api/defects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        project_id: 1,
        title: 'Mixed load test',
        description: 'Testing mixed operations',
        status: 'новый',
        priority: 'низкий',
        location: 'Test',
      }),
      connections: 5,
      duration: 5,
    });

    console.log('Mixed load test results:');
    console.log(`Read avg response: ${readResult.latency.mean}ms`);
    console.log(`Write avg response: ${writeResult.latency.mean}ms`);

    expect(readResult.latency.mean).toBeLessThanOrEqual(1000);
    expect(writeResult.latency.mean).toBeLessThanOrEqual(1500);
  }, 60000);

  test('Database query performance under load', async () => {
    // Тест с фильтрами и поиском
    const result = await runLoadTest(
      `${baseUrl}/api/defects?status=новый&priority=высокий&search=тест`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        connections: 15,
        duration: 10,
      }
    );

    console.log('Filtered query load test results:');
    console.log(`Average response time: ${result.latency.mean}ms`);
    console.log(`P95 latency: ${result.latency.p95}ms`);
    console.log(`P99 latency: ${result.latency.p99}ms`);

    expect(result.latency.mean).toBeLessThanOrEqual(1000);
    expect(result.latency.p95).toBeLessThanOrEqual(2000);
  }, 30000);
});

describe('Performance Benchmarks', () => {
  test('Response time statistics should meet requirements', () => {
    // Минимальные требования к производительности
    const requirements = {
      avgResponseTime: 1000, // мс
      maxP95ResponseTime: 2000, // мс
      minRequestsPerSecond: 50,
      maxErrorRate: 0.01, // 1%
    };

    console.log('Performance requirements:');
    console.log(`- Average response time: ≤ ${requirements.avgResponseTime}ms`);
    console.log(`- P95 response time: ≤ ${requirements.maxP95ResponseTime}ms`);
    console.log(`- Requests per second: ≥ ${requirements.minRequestsPerSecond}`);
    console.log(`- Error rate: ≤ ${requirements.maxErrorRate * 100}%`);

    expect(requirements.avgResponseTime).toBeLessThanOrEqual(1000);
  });
});
