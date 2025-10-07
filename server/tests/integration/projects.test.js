const request = require('supertest');
const app = require('../../src/index');
const db = require('../../src/services/db');

describe('Projects Integration Tests', () => {
  let authToken;
  let adminToken;
  let projectId;

  beforeAll(async () => {
    // Login as engineer
    const engineerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'engineer@test.com',
        password: 'password123',
      });
    authToken = engineerLogin.body.token;

    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123',
      });
    adminToken = adminLogin.body.token;
  });

  afterAll(async () => {
    // Cleanup test data
    if (projectId) {
      await db.query('DELETE FROM defects WHERE project_id = $1', [projectId]);
      await db.query('DELETE FROM project_stages WHERE project_id = $1', [projectId]);
      await db.query('DELETE FROM projects WHERE id = $1', [projectId]);
    }
    await db.end();
  });

  describe('Complete Project Lifecycle', () => {
    test('should create a new project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Тестовый проект интеграции',
          description: 'Описание тестового проекта',
          address: 'ул. Тестовая, д. 1',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          status: 'active',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Тестовый проект интеграции');
      projectId = response.body.id;
    });

    test('should retrieve created project', async () => {
      const response = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(projectId);
      expect(response.body.name).toBe('Тестовый проект интеграции');
    });

    test('should add project stage', async () => {
      const response = await request(app)
        .post('/api/project-stages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_id: projectId,
          name: 'Фундамент',
          planned_start: '2025-01-01',
          planned_end: '2025-03-31',
          status: 'planned',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Фундамент');
    });

    test('should list project stages', async () => {
      const response = await request(app)
        .get(`/api/project-stages?project_id=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should update project', async () => {
      const response = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Тестовый проект обновлён',
          description: 'Обновлённое описание',
          address: 'ул. Тестовая, д. 1',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          status: 'active',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Тестовый проект обновлён');
    });

    test('should list all projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      const testProject = response.body.find(p => p.id === projectId);
      expect(testProject).toBeDefined();
    });
  });

  describe('Project Permissions', () => {
    test('should prevent non-admin from creating project', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Unauthorized Project',
          description: 'Should fail',
          address: 'Test',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          status: 'active',
        });

      expect(response.status).toBe(403);
    });

    test('should prevent unauthorized access', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(403);
    });
  });
});
