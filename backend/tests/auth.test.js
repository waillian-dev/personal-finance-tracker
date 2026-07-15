const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');

// Mock User model and jsonwebtoken
jest.mock('../models/User');
jest.mock('jsonwebtoken');

describe('Auth Controller Integration Tests', () => {
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      _id: '507f1f77bcf86cd799439011',
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword123',
      currency: 'USD',
      theme: 'dark',
      monthlySalary: 5000,
      save: jest.fn().mockResolvedValue(true),
      matchPassword: jest.fn().mockResolvedValue(true),
    };
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      User.findOne.mockResolvedValue(null); // No existing user
      User.create.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mocktoken123');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.email).toBe('john@example.com');
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
      expect(User.create).toHaveBeenCalled();
    });

    it('should fail registration if fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'john@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Please add all fields');
    });

    it('should fail if user already exists', async () => {
      User.findOne.mockResolvedValue(mockUser); // Existing user found

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return tokens', async () => {
      // Mock User.findOne to support chained select()
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser),
      };
      User.findOne.mockReturnValue(mockQuery);
      jwt.sign.mockReturnValue('mocktoken123');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('mocktoken123');
      expect(mockUser.matchPassword).toHaveBeenCalledWith('Password123!');
    });

    it('should fail login with incorrect credentials', async () => {
      mockUser.matchPassword.mockResolvedValue(false); // wrong password
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser),
      };
      User.findOne.mockReturnValue(mockQuery);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile when authorized', async () => {
      jwt.verify.mockReturnValue({ id: mockUser._id });
      // Mock protect middleware query
      const mockSelect = {
        select: jest.fn().mockResolvedValue(mockUser),
      };
      User.findById.mockReturnValue(mockSelect);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer validtoken123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('john@example.com');
    });

    it('should fail profile access without token', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not authorized, no token');
    });
  });
});
