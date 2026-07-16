const mongoose = require('mongoose');

const SavingGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a goal name'],
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: [true, 'Please add a target amount'],
      min: [0, 'Target amount cannot be negative'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
    },
    targetDate: {
      type: Date,
      default: null,
    },
    color: {
      type: String,
      default: '#10B981',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SavingGoal', SavingGoalSchema);
