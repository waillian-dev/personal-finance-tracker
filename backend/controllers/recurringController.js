const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const Category = require('../models/Category');

// @desc    Check and execute due recurring transactions
const checkAndExecuteRecurring = async (userId) => {
  try {
    const activeRecurring = await RecurringTransaction.find({
      userId,
      isActive: true,
      nextDueDate: { $lte: new Date() }
    });

    for (const rec of activeRecurring) {
      let currentDueDate = new Date(rec.nextDueDate);
      const now = new Date();
      let updated = false;

      while (currentDueDate <= now) {
        updated = true;

        // 1. Create the Transaction
        await Transaction.create({
          userId: rec.userId,
          walletId: rec.walletId,
          categoryId: rec.categoryId,
          type: rec.type,
          amount: rec.amount,
          date: new Date(currentDueDate),
          description: `Auto-Recurring: ${rec.name}`,
        });

        // 2. Adjust Wallet Balance
        const wallet = await Wallet.findById(rec.walletId);
        if (wallet) {
          if (rec.type === 'income') {
            wallet.balance += rec.amount;
          } else if (rec.type === 'expense') {
            wallet.balance -= rec.amount;
          }
          await wallet.save();
        }

        // 3. Calculate next due date
        if (rec.frequency === 'daily') {
          currentDueDate.setDate(currentDueDate.getDate() + 1);
        } else if (rec.frequency === 'weekly') {
          currentDueDate.setDate(currentDueDate.getDate() + 7);
        } else if (rec.frequency === 'monthly') {
          currentDueDate.setMonth(currentDueDate.getMonth() + 1);
        } else if (rec.frequency === 'yearly') {
          currentDueDate.setFullYear(currentDueDate.getFullYear() + 1);
        }
      }

      if (updated) {
        rec.nextDueDate = currentDueDate;
        await rec.save();
      }
    }
  } catch (error) {
    console.error('Error executing recurring transactions:', error);
  }
};

// @desc    Get all active recurring transactions
// @route   GET /api/recurring
// @access  Private
const getRecurring = async (req, res) => {
  try {
    // Automatically trigger run check first
    await checkAndExecuteRecurring(req.user.id);

    const recurring = await RecurringTransaction.find({ userId: req.user.id })
      .populate('walletId', 'name color currency type')
      .populate('categoryId', 'name emoji icon color');

    res.json({ success: true, data: recurring });
  } catch (error) {
    console.error('Get recurring error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a recurring transaction setup
// @route   POST /api/recurring
// @access  Private
const createRecurring = async (req, res) => {
  try {
    const { name, type, amount, walletId, categoryId, frequency, nextDueDate } = req.body;

    if (!name || !type || !amount || !walletId || !categoryId || !nextDueDate) {
      return res.status(400).json({ success: false, error: 'Please add all required fields' });
    }

    const wallet = await Wallet.findById(walletId);
    if (!wallet || wallet.userId.toString() !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Wallet not found or unauthorized' });
    }

    const category = await Category.findById(categoryId);
    if (!category || (category.userId && category.userId.toString() !== req.user.id)) {
      return res.status(404).json({ success: false, error: 'Category not found or unauthorized' });
    }

    const recurring = await RecurringTransaction.create({
      userId: req.user.id,
      name,
      type,
      amount,
      walletId,
      categoryId,
      frequency: frequency || 'monthly',
      nextDueDate: new Date(nextDueDate),
    });

    // Run execution check immediately in case due date is in past or today
    await checkAndExecuteRecurring(req.user.id);

    res.status(201).json({ success: true, data: recurring });
  } catch (error) {
    console.error('Create recurring error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update a recurring transaction setup
// @route   PUT /api/recurring/:id
// @access  Private
const updateRecurring = async (req, res) => {
  try {
    let recurring = await RecurringTransaction.findById(req.params.id);

    if (!recurring) {
      return res.status(404).json({ success: false, error: 'Recurring transaction not found' });
    }

    if (recurring.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    recurring = await RecurringTransaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: recurring });
  } catch (error) {
    console.error('Update recurring error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a recurring transaction setup
// @route   DELETE /api/recurring/:id
// @access  Private
const deleteRecurring = async (req, res) => {
  try {
    const recurring = await RecurringTransaction.findById(req.params.id);

    if (!recurring) {
      return res.status(404).json({ success: false, error: 'Recurring transaction not found' });
    }

    if (recurring.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    await recurring.deleteOne();
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Delete recurring error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  checkAndExecuteRecurring,
};
