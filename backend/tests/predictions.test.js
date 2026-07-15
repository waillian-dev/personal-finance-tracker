const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const User = require('../models/User');

jest.mock('../models/Transaction');
jest.mock('../models/Category');
jest.mock('../models/User');
jest.mock('jsonwebtoken');

describe('Predictions Controller Integration Tests', () => {
  let mockUser;
  let mockTransactions;
  let mockCategories;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      _id: '507f1f77bcf86cd799439011',
      id: '507f1f77bcf86cd799439011',
      name: 'John Doe',
      email: 'john@example.com',
      monthlySalary: 3000,
    };

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    mockTransactions = [
      {
        _id: 't1',
        userId: mockUser._id,
        type: 'expense',
        amount: 150,
        date: tenDaysAgo, // 10 days ago (sets span start)
        categoryId: { _id: 'c1', name: 'Food & Dining', type: 'expense', color: '#EF4444', emoji: '🍔' },
      },
      {
        _id: 't2',
        userId: mockUser._id,
        type: 'expense',
        amount: 250,
        date: twoDaysAgo, // 2 days ago
        categoryId: { _id: 'c2', name: 'Shopping', type: 'expense', color: '#EC4899', emoji: '🛍️' },
      },
    ];

    mockCategories = [
      { _id: 'c1', name: 'Food & Dining', type: 'expense', color: '#EF4444', emoji: '🍔' },
      { _id: 'c2', name: 'Shopping', type: 'expense', color: '#EC4899', emoji: '🛍️' },
    ];

    // Auto authorize
    jwt.verify.mockReturnValue({ id: mockUser._id });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
  });

  describe('GET /api/predictions/expenses', () => {
    it('should forecast future expenses based on daily average spend of span', async () => {
      const mockQueryChain = {
        populate: jest.fn().mockResolvedValue(mockTransactions),
      };
      Transaction.find.mockReturnValue(mockQueryChain);

      const response = await request(app)
        .get('/api/predictions/expenses')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const { data } = response.body;
      expect(data.averageDailySpend).toBeGreaterThan(0);
      expect(data.forecastedTotal).toBe(parseFloat((data.averageDailySpend * 30).toFixed(2)));
      expect(data.confidenceScore).toBeGreaterThanOrEqual(20);
      expect(data.categoryForecasts.length).toBe(2);
      expect(data).toHaveProperty('insight');
    });

    it('should handle zero transactions gracefully', async () => {
      const mockQueryChain = {
        populate: jest.fn().mockResolvedValue([]),
      };
      Transaction.find.mockReturnValue(mockQueryChain);

      const response = await request(app)
        .get('/api/predictions/expenses')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.forecastedTotal).toBe(0);
      expect(response.body.data.confidenceScore).toBe(30);
    });
  });

  describe('GET /api/predictions/budgets', () => {
    it('should generate optimization budget recommendations based on discretionary status', async () => {
      const mockQueryChain = {
        populate: jest.fn().mockResolvedValue(mockTransactions),
      };
      Transaction.find.mockReturnValue(mockQueryChain);

      const response = await request(app)
        .get('/api/predictions/budgets')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const { data } = response.body;
      expect(data.monthlyIncomeEstimate).toBe(3000); // from user monthlySalary
      expect(data.monthlyExpenseEstimate).toBe(200); // 400 total over 2 months average
      expect(data.discretionaryIncome).toBe(2800); // 3000 - 200
      expect(data.suggestions.length).toBe(2);
      expect(data.suggestions[0]).toHaveProperty('suggestedBudget');
      expect(data.suggestions[0]).toHaveProperty('savingsPotential');
    });

    it('should return default starter budgets if no transaction data exists', async () => {
      const mockQueryChain = {
        populate: jest.fn().mockResolvedValue([]),
      };
      Transaction.find.mockReturnValue(mockQueryChain);
      Category.find.mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/predictions/budgets')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);
      expect(response.body.data.generalRecommendation).toContain('Log more transactions');
    });
  });
});
