const jwt = require('jsonwebtoken');
const authMiddleware = require('../../src/middleware/auth');
const roleCheck = require('../../src/middleware/roleCheck');
const errorHandler = require('../../src/middleware/errorHandler');
const config = require('../../src/config');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('should reject request without token', () => {
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject request with invalid token', () => {
    req.headers.authorization = 'Bearer invalid_token';

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('should accept request with valid token', () => {
    const payload = { userId: 1, role: 'admin' };
    const token = jwt.sign(payload, config.jwt.secret);
    req.headers.authorization = `Bearer ${token}`;

    authMiddleware(req, res, next);

    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe(1);
    expect(req.user.role).toBe('admin');
    expect(next).toHaveBeenCalled();
  });

  test('should handle Bearer token format', () => {
    const payload = { userId: 1, role: 'admin' };
    const token = jwt.sign(payload, config.jwt.secret);
    req.headers.authorization = `Bearer ${token}`;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('Role Check Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('should allow admin role for admin-only route', () => {
    req.user.role = 'admin';
    const middleware = roleCheck(['admin']);

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should reject non-admin role for admin-only route', () => {
    req.user.role = 'engineer';
    const middleware = roleCheck(['admin']);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('should allow multiple roles', () => {
    req.user.role = 'manager';
    const middleware = roleCheck(['admin', 'manager']);

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should reject observer for manager/admin route', () => {
    req.user.role = 'observer';
    const middleware = roleCheck(['admin', 'manager']);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    // Мокируем console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('should handle generic errors', () => {
    const error = new Error('Test error');
    error.status = 500;
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
      })
    );
  });

  test('should handle custom status codes', () => {
    const error = new Error('Not found');
    error.name = 'NotFoundError';
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('should handle validation errors', () => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    error.errors = [];
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
      })
    );
  });
});
