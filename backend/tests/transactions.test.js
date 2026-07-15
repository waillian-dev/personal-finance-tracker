const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const Category = require('../models/Category');
const User = require('../models/User');

jest.mock('../models/Transaction');
jest.mock('../models/Wallet');
jest.mock('../models/Category');
jest.mock('../models/User');
jest.mock('jsonwebtoken');

describe('Transactions Controller Integration Tests', () => {
  let mockUser;
  let mockWallet;
  let mockCategory;
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      _id: '507f1f77bcf86cd799439011',
      id: '507f1f77bcf86cd799439011',
      name: 'John Doe',
      email: 'john@example.com',
    };

    mockWallet = {
      _id: '507f1f77bcf86cd799439022',
      userId: mockUser._id,
      name: 'Cash Wallet',
      balance: 500,
      currency: 'USD',
    };

    mockCategory = {
      _id: '507f1f77bcf86cd799439033',
      userId: null,
      name: 'Food & Dining',
      type: 'expense',
    };

    mockTransaction = {
      _id: '507f1f77bcf86cd799439044',
      userId: mockUser._id,
      walletId: mockWallet._id,
      categoryId: mockCategory._id,
      type: 'expense',
      amount: 50,
      date: new Date(),
      description: 'Lunch',
      merchant: 'Green Restaurant',
      deleteOne: jest.fn().mockResolvedValue(true),
    };

    // Auto authorize
    jwt.verify.mockReturnValue({ id: mockUser._id });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
  });

  describe('GET /api/transactions', () => {
    it('should fetch user transactions successfully', async () => {
      // Mock mongoose query builder chain
      const mockQueryChain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockTransaction]),
      };

      Transaction.find.mockReturnValue(mockQueryChain);
      Transaction.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].amount).toBe(50);
    });
  });

  describe('POST /api/transactions', () => {
    it('should create an expense transaction and deduct from wallet balance', async () => {
      Wallet.findById.mockResolvedValue(mockWallet);
      Category.findById.mockResolvedValue(mockCategory);
      Transaction.create.mockResolvedValue(mockTransaction);
      Wallet.findByIdAndUpdate.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer token123')
        .send({
          walletId: mockWallet._id,
          categoryId: mockCategory._id,
          type: 'expense',
          amount: 50,
          description: 'Lunch',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(50);
      expect(Wallet.findByIdAndUpdate).toHaveBeenCalledWith(
        mockWallet._id,
        { $inc: { balance: -50 } }
      );
    });

    it('should fail if amount is negative', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer token123')
        .send({
          walletId: mockWallet._id,
          categoryId: mockCategory._id,
          type: 'expense',
          amount: -5,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Amount must be greater than zero');
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should delete a transaction and restore wallet balance', async () => {
      Transaction.findById.mockResolvedValue(mockTransaction);
      Wallet.findByIdAndUpdate.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/transactions/${mockTransaction._id}`)
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Wallet.findByIdAndUpdate).toHaveBeenCalledWith(
        mockWallet._id,
        { $inc: { balance: 50 } } // expense of 50 reversed means adding 50 back
      );
      expect(mockTransaction.deleteOne).toHaveBeenCalled();
    });
  });
});
