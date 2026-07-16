const SavingGoal = require('../models/SavingGoal');
const Wallet = require('../models/Wallet');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');

// Helper function to find or create a system/user 'Savings' category
const getOrCreateSavingsCategory = async (userId) => {
  // 1. Look for custom user Savings category
  let category = await Category.findOne({ userId, name: 'Savings', type: 'expense' });
  if (category) return category;

  // 2. Look for global default Savings category (if it exists)
  category = await Category.findOne({ userId: null, name: 'Savings', type: 'expense' });
  if (category) return category;

  // 3. Fallback: Create custom Savings category for this user
  category = await Category.create({
    userId,
    name: 'Savings',
    type: 'expense',
    color: '#10B981',
    emoji: '🏦',
    icon: 'account-balance',
  });
  return category;
};

// @desc    Get all saving goals
// @route   GET /api/saving-goals
// @access  Private
const getSavingGoals = async (req, res) => {
  try {
    const goals = await SavingGoal.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: goals.length,
      data: goals,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a saving goal
// @route   POST /api/saving-goals
// @access  Private
const createSavingGoal = async (req, res) => {
  try {
    const { name, targetAmount, targetDate, color } = req.body;

    if (!name || targetAmount === undefined) {
      return res.status(400).json({ success: false, error: 'Please add a name and target amount' });
    }

    if (targetAmount < 0) {
      return res.status(400).json({ success: false, error: 'Target amount cannot be negative' });
    }

    const goal = await SavingGoal.create({
      userId: req.user.id,
      name,
      targetAmount,
      targetDate: targetDate || null,
      color: color || '#10B981',
      currentAmount: 0,
      isCompleted: false,
    });

    res.status(201).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update a saving goal
// @route   PUT /api/saving-goals/:id
// @access  Private
const updateSavingGoal = async (req, res) => {
  try {
    let goal = await SavingGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, error: 'Saving goal not found' });
    }

    if (goal.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const { name, targetAmount, targetDate, color } = req.body;

    if (targetAmount !== undefined && targetAmount < 0) {
      return res.status(400).json({ success: false, error: 'Target amount cannot be negative' });
    }

    const updates = {
      name: name || goal.name,
      targetAmount: targetAmount !== undefined ? targetAmount : goal.targetAmount,
      targetDate: targetDate !== undefined ? targetDate : goal.targetDate,
      color: color || goal.color,
    };

    // Re-verify completion state if targetAmount changed
    if (targetAmount !== undefined) {
      updates.isCompleted = goal.currentAmount >= targetAmount;
    }

    goal = await SavingGoal.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a saving goal
// @route   DELETE /api/saving-goals/:id
// @access  Private
const deleteSavingGoal = async (req, res) => {
  try {
    const goal = await SavingGoal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ success: false, error: 'Saving goal not found' });
    }

    if (goal.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    await goal.deleteOne();

    res.json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Add savings to goal from a wallet
// @route   POST /api/saving-goals/:id/add-savings
// @access  Private
const addSavings = async (req, res) => {
  try {
    const { amount, walletId, description } = req.body;

    if (amount === undefined || !walletId) {
      return res.status(400).json({ success: false, error: 'Please specify amount and source wallet' });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });
    }

    const goal = await SavingGoal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Saving goal not found' });
    }

    if (goal.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    const wallet = await Wallet.findById(walletId);
    if (!wallet || wallet.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Wallet not found or unauthorized' });
    }

    // Optional check: restrict if wallet balance is less than contribution
    if (wallet.type !== 'credit_card' && wallet.balance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient funds in the selected wallet' });
    }

    // 1. Update wallet balance atomically
    await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: -amount } });

    // 2. Update goal current amount & check completion
    const newCurrentAmount = goal.currentAmount + amount;
    const isCompleted = newCurrentAmount >= goal.targetAmount;
    
    const updatedGoal = await SavingGoal.findByIdAndUpdate(
      req.params.id,
      { 
        $inc: { currentAmount: amount },
        isCompleted
      },
      { new: true }
    );

    // 3. Find or create Category 'Savings'
    const category = await getOrCreateSavingsCategory(req.user.id);

    // 4. Create expense Transaction to document contribution
    const transaction = await Transaction.create({
      userId: req.user.id,
      walletId,
      categoryId: category._id,
      type: 'expense',
      amount,
      date: new Date(),
      description: description || `Savings Contribution: ${goal.name}`,
    });

    res.json({
      success: true,
      data: {
        goal: updatedGoal,
        transaction,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Withdraw savings from goal back to a wallet
// @route   POST /api/saving-goals/:id/withdraw-savings
// @access  Private
const withdrawSavings = async (req, res) => {
  try {
    const { amount, walletId, description } = req.body;

    if (amount === undefined || !walletId) {
      return res.status(400).json({ success: false, error: 'Please specify amount and target wallet' });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than zero' });
    }

    const goal = await SavingGoal.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Saving goal not found' });
    }

    if (goal.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    if (goal.currentAmount < amount) {
      return res.status(400).json({ success: false, error: 'Cannot withdraw more than current goal savings' });
    }

    const wallet = await Wallet.findById(walletId);
    if (!wallet || wallet.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Wallet not found or unauthorized' });
    }

    // 1. Update wallet balance atomically (refunding money)
    await Wallet.findByIdAndUpdate(walletId, { $inc: { balance: amount } });

    // 2. Update goal current amount & check completion
    const newCurrentAmount = goal.currentAmount - amount;
    const isCompleted = newCurrentAmount >= goal.targetAmount;

    const updatedGoal = await SavingGoal.findByIdAndUpdate(
      req.params.id,
      { 
        $inc: { currentAmount: -amount },
        isCompleted
      },
      { new: true }
    );

    // 3. Find or create Category 'Savings'
    const category = await getOrCreateSavingsCategory(req.user.id);

    // 4. Create income Transaction to document withdrawal
    const transaction = await Transaction.create({
      userId: req.user.id,
      walletId,
      categoryId: category._id,
      type: 'income',
      amount,
      date: new Date(),
      description: description || `Savings Withdrawal: ${goal.name}`,
    });

    res.json({
      success: true,
      data: {
        goal: updatedGoal,
        transaction,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getSavingGoals,
  createSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
  addSavings,
  withdrawSavings,
};
