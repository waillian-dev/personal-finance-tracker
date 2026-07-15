const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

jest.mock('../models/Wallet');
jest.mock('../models/Transaction');
jest.mock('../models/User');
jest.mock('jsonwebtoken');

describe('Reports Controller Integration Tests', () => {
  let mockUser;
  let mockWallets;
  let mockTransactions;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      _id: '507f1f77bcf86cd799439011',
      id: '507f1f77bcf86cd799439011',
      name: 'John Doe',
      email: 'john@example.com',
      monthlySalary: 4000,
    };

    mockWallets = [
      { _id: 'w1', name: 'Cash', balance: 500, userId: mockUser._id },
      { _id: 'w2', name: 'Savings Account', balance: 3500, userId: mockUser._id },
    ];

    mockTransactions = [
      {
        _id: 't1',
        userId: mockUser._id,
        walletId: 'w2',
        categoryId: { _id: 'c1', name: 'Salary', type: 'income', color: '#10B981', emoji: '💰' },
        type: 'income',
        amount: 3000,
        date: new Date(),
      },
      {
        _id: 't2',
        userId: mockUser._id,
        walletId: 'w1',
        categoryId: { _id: 'c2', name: 'Food & Dining', type: 'expense', color: '#EF4444', emoji: '🍔' },
        type: 'expense',
        amount: 400,
        date: new Date(),
      },
      {
        _id: 't3',
        userId: mockUser._id,
        walletId: 'w1',
        categoryId: { _id: 'c3', name: 'Shopping', type: 'expense', color: '#EC4899', emoji: '🛍️' },
        type: 'expense',
        amount: 200,
        date: new Date(),
      },
    ];

    // Auto authorize
    jwt.verify.mockReturnValue({ id: mockUser._id });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
  });

  describe('GET /api/reports/dashboard', () => {
    it('should calculate net worth and monthly cash flow metrics correctly', async () => {
      Wallet.find.mockResolvedValue(mockWallets);
      
      // Mock Transaction.find to populate categoryId
      const mockQueryChain = {
        populate: jest.fn().mockResolvedValue(mockTransactions),
      };
      Transaction.find.mockReturnValue(mockQueryChain);

      const response = await request(app)
        .get('/api/reports/dashboard')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const { data } = response.body;
      expect(data.netWorth).toBe(4000); // 500 + 3500
      expect(data.monthlyIncome).toBe(3000); // 3000
      expect(data.monthlyExpense).toBe(600); // 400 + 200
      expect(data.savings).toBe(2400); // 3000 - 600
      expect(data.savingsRate).toBe(80); // (2400/3000)*100
      expect(data.financialHealthScore).toBeGreaterThanOrEqual(30);
      expect(data.financialHealthScore).toBeLessThanOrEqual(100);

      // Verify category spending percentage aggregation
      expect(data.topCategories.length).toBe(2);
      expect(data.topCategories[0].name).toBe('Food & Dining');
      expect(data.topCategories[0].amount).toBe(400);
      expect(data.topCategories[0].percentage).toBe(66.67); // (400/600)*100
    });
  });

  describe('GET /api/reports/monthly', () => {
    it('should aggregate details for a specific month', async () => {
      const mockQueryChain = {
        populate: jest.fn().mockResolvedValue(mockTransactions),
      };
      Transaction.find.mockReturnValue(mockQueryChain);

      const response = await request(app)
        .get('/api/reports/monthly?month=7&year=2026')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totals.income).toBe(3000);
      expect(response.body.data.totals.expense).toBe(600);
      expect(response.body.data.categoryBreakdown.length).toBe(2);
      expect(response.body.data.dailyBreakdown.length).toBeGreaterThan(28); // 31 days in July
    });
  });

  describe('GET /api/reports/yearly', () => {
    it('should group transactions into monthly summaries for the year', async () => {
      Transaction.find.mockResolvedValue(mockTransactions);

      const response = await request(app)
        .get('/api/reports/yearly?year=2026')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.year).toBe(2026);
      expect(response.body.data.totals.income).toBe(3000);
      expect(response.body.data.totals.expense).toBe(600);
      expect(response.body.data.monthlyBreakdown.length).toBe(12);
    });
  });
});
