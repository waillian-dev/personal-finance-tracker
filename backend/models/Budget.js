const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a budget name'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please add a budget amount'],
    },
    period: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      default: 'monthly',
    },
    type: {
      type: String,
      enum: ['category', 'wallet', 'global'],
      default: 'global',
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'targetModel',
      default: null,
    },
    targetModel: {
      type: String,
      enum: ['Category', 'Wallet', null],
      default: null,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    alertThreshold: {
      type: Number,
      default: 80, // percentage warning threshold (e.g. 80%)
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Budget', BudgetSchema);
