const Category = require('../models/Category');

// @desc    Get all categories (system default + user custom)
// @route   GET /api/categories
// @access  Private
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      $or: [
        { userId: null }, // default categories
        { userId: req.user.id }, // user-created categories
      ],
    });

    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Create a custom category
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
  try {
    const { name, type, color, emoji, icon } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Please add name and type' });
    }

    // Check if category name already exists for this user (or default)
    const categoryExists = await Category.findOne({
      userId: req.user.id,
      name,
      type,
    });

    if (categoryExists) {
      return res.status(400).json({ success: false, error: 'Category already exists' });
    }

    const category = await Category.create({
      userId: req.user.id,
      name,
      type,
      color,
      emoji,
      icon,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // System default categories cannot be modified
    if (!category.userId) {
      return res.status(403).json({ success: false, error: 'System categories cannot be modified' });
    }

    if (category.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // System default categories cannot be deleted
    if (!category.userId) {
      return res.status(403).json({ success: false, error: 'System categories cannot be deleted' });
    }

    if (category.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    await category.deleteOne();

    res.json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
