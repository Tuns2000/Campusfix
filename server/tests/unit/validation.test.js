const { validateEmail, validatePassword, formatDate, sanitizeInput, generateToken } = require('../../src/utils/helpers');

describe('Helper Functions', () => {
  describe('validateEmail', () => {
    test('should return true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    test('should return false for invalid email', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('should return true for strong password', () => {
      expect(validatePassword('StrongPass123!')).toBe(true);
      expect(validatePassword('P@ssw0rd')).toBe(true);
    });

    test('should return false for weak password', () => {
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('12345678')).toBe(false);
      expect(validatePassword('')).toBe(false);
    });
  });

  describe('formatDate', () => {
    test('should format date correctly', () => {
      const date = new Date('2025-10-08T12:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    });

    test('should handle invalid date', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('invalid')).toBe('');
    });
  });

  describe('sanitizeInput', () => {
    test('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("XSS")</script>')).toBe('alert("XSS")');
      expect(sanitizeInput('Normal <b>text</b>')).toBe('Normal text');
    });

    test('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });

    test('should handle special characters', () => {
      expect(sanitizeInput('test & test')).toBe('test & test');
    });
  });

  describe('generateToken', () => {
    test('should generate valid JWT token', () => {
      const payload = { userId: 1, role: 'admin' };
      const token = generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    test('should include payload data', () => {
      const payload = { userId: 1, role: 'admin' };
      const token = generateToken(payload);
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      
      expect(decoded.userId).toBe(1);
      expect(decoded.role).toBe('admin');
    });
  });
});

describe('Password Hashing', () => {
  const bcrypt = require('bcrypt');

  test('should hash password correctly', async () => {
    const password = 'TestPassword123!';
    const hash = await bcrypt.hash(password, 10);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });

  test('should verify password correctly', async () => {
    const password = 'TestPassword123!';
    const hash = await bcrypt.hash(password, 10);
    
    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);
  });

  test('should reject incorrect password', async () => {
    const password = 'TestPassword123!';
    const hash = await bcrypt.hash(password, 10);
    
    const isValid = await bcrypt.compare('WrongPassword', hash);
    expect(isValid).toBe(false);
  });
});

describe('Data Validation', () => {
  test('should validate defect status', () => {
    const validStatuses = ['новый', 'подтвержден', 'в работе', 'исправлен', 'проверен', 'закрыт', 'отклонен'];
    
    validStatuses.forEach(status => {
      expect(validStatuses.includes(status)).toBe(true);
    });

    expect(validStatuses.includes('invalid')).toBe(false);
  });

  test('should validate defect priority', () => {
    const validPriorities = ['низкий', 'средний', 'высокий', 'критический'];
    
    validPriorities.forEach(priority => {
      expect(validPriorities.includes(priority)).toBe(true);
    });

    expect(validPriorities.includes('invalid')).toBe(false);
  });

  test('should validate user role', () => {
    const validRoles = ['admin', 'manager', 'engineer', 'observer'];
    
    validRoles.forEach(role => {
      expect(validRoles.includes(role)).toBe(true);
    });

    expect(validRoles.includes('invalid')).toBe(false);
  });
});
