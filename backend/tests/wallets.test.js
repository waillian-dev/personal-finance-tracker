const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Wallet = require('../models/Wallet');
const User = require('../models/User');

jest.mock('../models/Wallet');
jest.mock('../models/User');
jest.mock('jsonwebtoken');

describe('Wallets Controller Integration Tests', () => {
  let mockUser;
  let mockWallet;

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
      color: '#10B981',
      icon: 'money-bill',
      type: 'cash',
      deleteOne: jest.fn().mockResolvedValue(true),
    };

    // Auto authorize by mocking JWT and user validation middleware queries
    jwt.verify.mockReturnValue({ id: mockUser._id });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser),
    });
  });

  describe('GET /api/wallets', () => {
    it('should retrieve all wallets for the user', async () => {
      Wallet.find.mockResolvedValue([mockWallet]);

      const response = await request(app)
        .get('/api/wallets')
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].name).toBe('Cash Wallet');
      expect(Wallet.find).toHaveBeenCalledWith({ userId: mockUser._id });
    });
  });

  describe('POST /api/wallets', () => {
    it('should create a new wallet successfully', async () => {
      Wallet.create.mockResolvedValue(mockWallet);

      const response = await request(app)
        .post('/api/wallets')
        .set('Authorization', 'Bearer token123')
        .send({
          name: 'Cash Wallet',
          balance: 500,
          currency: 'USD',
          type: 'cash',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Cash Wallet');
      expect(Wallet.create).toHaveBeenCalled();
    });

    it('should fail creation if name is missing', async () => {
      const response = await request(app)
        .post('/api/wallets')
        .set('Authorization', 'Bearer token123')
        .send({
          balance: 500,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Please add a wallet name');
    });
  });

  describe('PUT /api/wallets/:id', () => {
    it('should update a wallet if owned by user', async () => {
      Wallet.findById.mockResolvedValue(mockWallet);
      Wallet.findByIdAndUpdate.mockResolvedValue({
        ...mockWallet,
        name: 'Updated Wallet Name',
      });

      const response = await request(app)
        .put(`/api/wallets/${mockWallet._id}`)
        .set('Authorization', 'Bearer token123')
        .send({ name: 'Updated Wallet Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Wallet Name');
    });

    it('should return 404 if wallet does not exist', async () => {
      Wallet.findById.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/wallets/nonexistentid`)
        .set('Authorization', 'Bearer token123')
        .send({ name: 'Updated Wallet Name' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Wallet not found');
    });
  });

  describe('DELETE /api/wallets/:id', () => {
    it('should delete a wallet successfully', async () => {
      Wallet.findById.mockResolvedValue(mockWallet);

      const response = await request(app)
        .delete(`/api/wallets/${mockWallet._id}`)
        .set('Authorization', 'Bearer token123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockWallet.deleteOne).toHaveBeenCalled();
    });
  });
});
