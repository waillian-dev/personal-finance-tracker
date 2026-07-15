const Wallet = require('../models/Wallet');

// @desc    Get all user wallets
// @route   GET /api/wallets
// @access  Private
const getWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find({ userId: req.user.id });
    res.json({
      success: true,
      count: wallets.length,
      data: wallets,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a wallet
// @route   POST /api/wallets
// @access  Private
const createWallet = async (req, res) => {
  try {
    const { name, balance, currency, color, icon, type } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Please add a wallet name' });
    }

    const wallet = await Wallet.create({
      userId: req.user.id,
      name,
      balance: balance || 0,
      currency: currency || 'USD',
      color,
      icon,
      type,
    });

    res.status(201).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update a wallet
// @route   PUT /api/wallets/:id
// @access  Private
const updateWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findById(req.params.id);

    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    // Make sure user owns wallet
    if (wallet.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    wallet = await Wallet.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete a wallet
// @route   DELETE /api/wallets/:id
// @access  Private
const deleteWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findById(req.params.id);

    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    // Make sure user owns wallet
    if (wallet.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    await wallet.deleteOne();

    res.json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getWallets,
  createWallet,
  updateWallet,
  deleteWallet,
};
