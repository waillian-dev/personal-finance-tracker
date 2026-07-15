const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a wallet name'],
      trim: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    color: {
      type: String,
      default: '#10B981', // green hex default
    },
    icon: {
      type: String,
      default: 'account-balance-wallet',
    },
    type: {
      type: String,
      enum: ['cash', 'bank', 'mobile_wallet', 'credit_card', 'other'],
      default: 'cash',
    },
    creditLimit: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Wallet', WalletSchema);
