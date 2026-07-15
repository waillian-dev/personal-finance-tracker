require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');

const categoriesData = [
  // Income categories
  { name: 'Salary', type: 'income', color: '#10B981', emoji: '💰', icon: 'attach-money' },
  { name: 'Freelance', type: 'income', color: '#3B82F6', emoji: '💻', icon: 'laptop' },
  { name: 'Investments', type: 'income', color: '#8B5CF6', emoji: '📈', icon: 'trending-up' },
  { name: 'Gifts', type: 'income', color: '#EC4899', emoji: '🎁', icon: 'card-giftcard' },
  
  // Expense categories
  { name: 'Food & Dining', type: 'expense', color: '#EF4444', emoji: '🍔', icon: 'restaurant' },
  { name: 'Transport', type: 'expense', color: '#F59E0B', emoji: '🚗', icon: 'directions-car' },
  { name: 'Shopping', type: 'expense', color: '#EC4899', emoji: '🛍️', icon: 'shopping-bag' },
  { name: 'Bills & Utilities', type: 'expense', color: '#3B82F6', emoji: '🔌', icon: 'power' },
  { name: 'Entertainment', type: 'expense', color: '#8B5CF6', emoji: '🎬', icon: 'movie' },
  { name: 'Medical', type: 'expense', color: '#10B981', emoji: '🏥', icon: 'local-hospital' },
  { name: 'Rent', type: 'expense', color: '#6B7280', emoji: '🏠', icon: 'home' },
  { name: 'Travel', type: 'expense', color: '#14B8A6', emoji: '✈️', icon: 'flight' },
];

const seedData = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/personal_finance_tracker');
    console.log('MongoDB Connected for Seeding...');

    // Clear existing data
    await User.deleteMany();
    await Wallet.deleteMany();
    await Category.deleteMany();
    await Transaction.deleteMany();
    console.log('Cleared existing collections.');

    // 1. Seed global default categories (userId is null)
    const seededCategories = await Category.insertMany(categoriesData);
    console.log(`Seeded ${seededCategories.length} default categories.`);

    // Helper to find category ID
    const getCatId = (name) => seededCategories.find(c => c.name === name)._id;

    // 2. Create test user
    const testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!', // pre-save hashes this
      isVerified: true
    });
    console.log(`Created test user: ${testUser.email}`);

    // 3. Create wallets for test user
    const cashWallet = await Wallet.create({
      userId: testUser._id,
      name: 'Cash Wallet',
      balance: 655.00,
      currency: 'USD',
      color: '#10B981',
      icon: 'money-bill',
      type: 'cash'
    });

    const checkingWallet = await Wallet.create({
      userId: testUser._id,
      name: 'Checking Account',
      balance: 5100.00,
      currency: 'USD',
      color: '#3B82F6',
      icon: 'account-balance',
      type: 'bank'
    });
    console.log('Seeded 2 wallets.');

    // 4. Create historical transactions
    const transactions = [
      {
        userId: testUser._id,
        walletId: checkingWallet._id,
        categoryId: getCatId('Salary'),
        type: 'income',
        amount: 3000.00,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        description: 'Monthly Salary Paycheck',
        merchant: 'Acme Corp'
      },
      {
        userId: testUser._id,
        walletId: cashWallet._id,
        categoryId: getCatId('Food & Dining'),
        type: 'expense',
        amount: 45.00,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        description: 'Dinner with client',
        merchant: 'Green Grill Restaurant'
      },
      {
        userId: testUser._id,
        walletId: checkingWallet._id,
        categoryId: getCatId('Shopping'),
        type: 'expense',
        amount: 120.00,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        description: 'Running shoes',
        merchant: 'Nike Store'
      },
      {
        userId: testUser._id,
        walletId: checkingWallet._id,
        categoryId: getCatId('Bills & Utilities'),
        type: 'expense',
        amount: 80.00,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        description: 'High-speed Internet Service',
        merchant: 'Comcast'
      },
      {
        userId: testUser._id,
        walletId: checkingWallet._id,
        categoryId: getCatId('Transport'),
        type: 'transfer',
        amount: 200.00,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        description: 'ATM withdrawal to cash',
        destinationWalletId: cashWallet._id,
        merchant: 'Chase ATM'
      }
    ];

    await Transaction.insertMany(transactions);
    console.log(`Seeded ${transactions.length} historical transactions.`);

    console.log('Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

seedData();
