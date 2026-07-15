const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const Category = require('../models/Category');
const { checkAndExecuteRecurring } = require('./recurringController');

// @desc    Get all user transactions
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    // Run execution check on auto-recurring transactions
    await checkAndExecuteRecurring(req.user.id);

    const { type, walletId, categoryId, startDate, endDate, limit, page } = req.query;

    const query = { userId: req.user.id };

    if (type) query.type = type;
    if (walletId) query.walletId = walletId;
    if (categoryId) query.categoryId = categoryId;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const pageSize = parseInt(limit, 10) || 50;
    const pageNumber = parseInt(page, 10) || 1;
    const skip = (pageNumber - 1) * pageSize;

    const transactions = await Transaction.find(query)
      .populate('walletId', 'name color currency type')
      .populate('categoryId', 'name type color emoji icon')
      .populate('destinationWalletId', 'name color currency type')
      .sort({ date: -1 })
      .skip(skip)
      .limit(pageSize);

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      count: transactions.length,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
      data: transactions,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a transaction (adjusts wallet balance)
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const {
      walletId,
      categoryId,
      type,
      amount,
      date,
      description,
      merchant,
      destinationWalletId,
    } = req.body;

    if (!walletId || !categoryId || !type || amount === undefined) {
      return res.status(400).json({ success: false, error: 'Please add all required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });
    }

    // Verify wallet ownership
    const wallet = await Wallet.findById(walletId);
    if (!wallet || wallet.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Wallet not found or unauthorized' });
    }

    // Verify category ownership or default category
    const category = await Category.findById(categoryId);
    if (!category || (category.userId && category.userId.toString() !== req.user.id)) {
      return res.status(404).json({ success: false, error: 'Category not found or unauthorized' });
    }

    // If transfer type, verify destination wallet ownership
    let destWallet = null;
    if (type === 'transfer') {
      if (!destinationWalletId) {
        return res.status(400).json({ success: false, error: 'Destination wallet required for transfers' });
      }
      destWallet = await Wallet.findById(destinationWalletId);
      if (!destWallet || destWallet.userId.toString() !== req.user.id) {
        return res.status(404).json({ success: false, error: 'Destination wallet not found or unauthorized' });
      }
    }

    // Create transaction
    const transaction = await Transaction.create({
      userId: req.user.id,
      walletId,
      categoryId,
      type,
      amount,
      date: date || new Date(),
      description,
      merchant,
      destinationWalletId: type === 'transfer' ? destinationWalletId : null,
    });

    // Update wallet balances atomically
    if (type === 'expense') {
      await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: -amount } });
    } else if (type === 'income') {
      await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: amount } });
    } else if (type === 'transfer') {
      // Deduct from source wallet
      await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: -amount } });
      // Add to destination wallet
      await Wallet.findByIdAndUpdate(destinationWalletId, { $inc: { balance: amount } });
    }

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a transaction (reverses wallet balance adjust)
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (transaction.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    // Revert balance changes in wallets
    if (transaction.type === 'expense') {
      await Wallet.findByIdAndUpdate(transaction.walletId, { $inc: { balance: transaction.amount } });
    } else if (transaction.type === 'income') {
      await Wallet.findByIdAndUpdate(transaction.walletId, { $inc: { balance: -transaction.amount } });
    } else if (transaction.type === 'transfer') {
      // Revert deduction from source wallet
      await Wallet.findByIdAndUpdate(transaction.walletId, { $inc: { balance: transaction.amount } });
      // Revert addition to destination wallet
      await Wallet.findByIdAndUpdate(transaction.destinationWalletId, { $inc: { balance: -transaction.amount } });
    }

    await transaction.deleteOne();

    res.json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (transaction.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const {
      walletId,
      categoryId,
      type,
      amount,
      date,
      description,
      merchant,
      destinationWalletId,
    } = req.body;

    // 1. REVERT old transaction balance adjustment
    if (transaction.type === 'expense') {
      await Wallet.findByIdAndUpdate(transaction.walletId, { $inc: { balance: transaction.amount } });
    } else if (transaction.type === 'income') {
      await Wallet.findByIdAndUpdate(transaction.walletId, { $inc: { balance: -transaction.amount } });
    } else if (transaction.type === 'transfer') {
      await Wallet.findByIdAndUpdate(transaction.walletId, { $inc: { balance: transaction.amount } });
      await Wallet.findByIdAndUpdate(transaction.destinationWalletId, { $inc: { balance: -transaction.amount } });
    }

    // 2. APPLY new transaction balance adjustment
    const targetWalletId = walletId || transaction.walletId.toString();
    const targetType = type || transaction.type;
    const targetAmount = amount !== undefined ? amount : transaction.amount;
    const targetDestWalletId = targetType === 'transfer' ? destinationWalletId : null;

    if (targetType === 'expense') {
      await Wallet.findByIdAndUpdate(targetWalletId, { $inc: { balance: -targetAmount } });
    } else if (targetType === 'income') {
      await Wallet.findByIdAndUpdate(targetWalletId, { $inc: { balance: targetAmount } });
    } else if (targetType === 'transfer') {
      await Wallet.findByIdAndUpdate(targetWalletId, { $inc: { balance: -targetAmount } });
      await Wallet.findByIdAndUpdate(targetDestWalletId, { $inc: { balance: targetAmount } });
    }

    // 3. Update fields
    transaction.walletId = targetWalletId;
    transaction.categoryId = categoryId || transaction.categoryId;
    transaction.type = targetType;
    transaction.amount = targetAmount;
    if (date) transaction.date = date;
    transaction.description = description !== undefined ? description : transaction.description;
    transaction.merchant = merchant !== undefined ? merchant : transaction.merchant;
    transaction.destinationWalletId = targetDestWalletId;

    await transaction.save();

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('walletId', 'name color currency type')
      .populate('categoryId', 'name type color emoji icon')
      .populate('destinationWalletId', 'name color currency type');

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (transaction.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Get transaction by id error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  getTransactionById,
};
