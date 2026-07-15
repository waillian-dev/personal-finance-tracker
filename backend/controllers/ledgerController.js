const mongoose = require('mongoose');
const LedgerTransaction = require('../models/LedgerTransaction');
const Friendship = require('../models/Friendship');

// @desc    Log a shared expense/split transaction with a friend
// @route   POST /api/ledger
// @access  Private
const createLedgerTransaction = async (req, res) => {
  try {
    const { description, amount, friendId, paidByMe, split50 } = req.body;

    if (!description || !amount || !friendId) {
      return res.status(400).json({ success: false, error: 'Please provide description, amount, and friendId' });
    }

    // Verify friendship exists and is accepted
    const friendship = await Friendship.findOne({
      status: 'accepted',
      $or: [
        { requester: req.user.id, recipient: friendId },
        { requester: friendId, recipient: req.user.id },
      ],
    });

    if (!friendship) {
      return res.status(400).json({ success: false, error: 'You are not friends with this user' });
    }

    // Calculate actual debt amount
    // If it is split 50/50, the debtor owes half. Otherwise, they owe the full amount.
    const debtAmount = split50 ? Number(amount) / 2 : Number(amount);

    const paidBy = paidByMe ? req.user.id : friendId;
    const owedBy = paidByMe ? friendId : req.user.id;

    const ledgerTx = await LedgerTransaction.create({
      description,
      amount: debtAmount,
      paidBy,
      owedBy,
      settled: false,
    });

    res.status(201).json({
      success: true,
      data: ledgerTx,
    });
  } catch (error) {
    console.error('Create ledger transaction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get transaction ledger list with a specific friend
// @route   GET /api/ledger/:friendId
// @access  Private
const getLedgerTransactions = async (req, res) => {
  try {
    const friendId = req.params.friendId;

    // Get all unsettled and settled ledger transactions between current user and friend
    const transactions = await LedgerTransaction.find({
      $or: [
        { paidBy: req.user.id, owedBy: friendId },
        { paidBy: friendId, owedBy: req.user.id },
      ],
    })
      .populate('paidBy', 'name email')
      .populate('owedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Get ledger transactions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Settle all outstanding debt transactions with a friend
// @route   POST /api/ledger/settle/:friendId
// @access  Private
const settleLedger = async (req, res) => {
  try {
    const friendId = req.params.friendId;

    // Mark all pending ledger transactions between them as settled
    const result = await LedgerTransaction.updateMany(
      {
        settled: false,
        $or: [
          { paidBy: req.user.id, owedBy: friendId },
          { paidBy: friendId, owedBy: req.user.id },
        ],
      },
      { settled: true }
    );

    // Optionally log a ledger transaction representing the settlement
    await LedgerTransaction.create({
      description: 'Settled Ledger Balance',
      amount: 0,
      paidBy: req.user.id,
      owedBy: friendId,
      settled: true,
    });

    res.json({
      success: true,
      message: `Settle complete. ${result.modifiedCount} transaction(s) marked settled.`,
    });
  } catch (error) {
    console.error('Settle ledger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Settle ledger with a custom payment amount and optional wallet sync
// @route   POST /api/ledger/pay
// @access  Private
const settleWithPayment = async (req, res) => {
  try {
    const { friendId, amount, walletId } = req.body;

    if (!friendId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Please provide friendId and a valid payment amount' });
    }

    const payAmount = Number(amount);

    // 1. Determine direction based on current net balance
    const paidByMe = await LedgerTransaction.aggregate([
      { $match: { paidBy: req.user._id, owedBy: new mongoose.Types.ObjectId(friendId), settled: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const owedByMe = await LedgerTransaction.aggregate([
      { $match: { paidBy: new mongoose.Types.ObjectId(friendId), owedBy: req.user._id, settled: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const mePaidTotal = paidByMe.length > 0 ? paidByMe[0].total : 0;
    const meOwedTotal = owedByMe.length > 0 ? owedByMe[0].total : 0;
    const netBalance = mePaidTotal - meOwedTotal;

    if (netBalance === 0) {
      return res.status(400).json({ success: false, error: 'Balances are already fully settled' });
    }

    const owesMe = netBalance > 0;
    const absBalance = Math.abs(netBalance);

    // 2. Create reverse ledger transaction
    const paidBy = owesMe ? friendId : req.user.id;
    const owedBy = owesMe ? req.user.id : friendId;

    const ledgerTx = await LedgerTransaction.create({
      description: 'Settlement Payment',
      amount: payAmount,
      paidBy,
      owedBy,
      settled: false,
    });

    // 3. If walletId is provided, log a standard wallet transaction
    if (walletId) {
      const Wallet = require('../models/Wallet');
      const Transaction = require('../models/Transaction');
      const Category = require('../models/Category');

      const wallet = await Wallet.findById(walletId);
      if (wallet && wallet.userId.toString() === req.user.id) {
        // Find or fallback to a category
        let category = await Category.findOne({
          name: owesMe ? /income/i : /expense/i,
          $or: [{ userId: null }, { userId: req.user.id }],
        });

        if (!category) {
          category = await Category.findOne({ $or: [{ userId: null }, { userId: req.user.id }] });
        }

        // Create transaction
        await Transaction.create({
          userId: req.user.id,
          walletId,
          categoryId: category ? category._id : null,
          type: owesMe ? 'income' : 'expense',
          amount: payAmount,
          description: owesMe ? `Settlement from friend` : `Settlement to friend`,
          date: new Date(),
        });

        // Update Wallet Balance
        wallet.balance += owesMe ? payAmount : -payAmount;
        await wallet.save();
      }
    }

    // 4. Archive / Settle all previous if this payment fully settles the balance
    if (Math.abs(absBalance - payAmount) < 0.01) {
      await LedgerTransaction.updateMany(
        {
          settled: false,
          $or: [
            { paidBy: req.user.id, owedBy: friendId },
            { paidBy: friendId, owedBy: req.user.id },
          ],
        },
        { settled: true }
      );
    }

    res.json({
      success: true,
      data: ledgerTx,
    });
  } catch (error) {
    console.error('Settle with payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createLedgerTransaction,
  getLedgerTransactions,
  settleLedger,
  settleWithPayment,
};
