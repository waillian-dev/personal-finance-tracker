const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null means it's a global/default category
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a category name'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Please specify category type (income or expense)'],
    },
    color: {
      type: String,
      default: '#6B7280', // grey default
    },
    emoji: {
      type: String,
      default: '📁',
    },
    icon: {
      type: String,
      default: 'folder',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of system categories or per-user categories
CategorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Category', CategorySchema);
