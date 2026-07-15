const express = require('express');
const {
  getExpenseForecast,
  getBudgetSuggestions,
} = require('../controllers/predictionsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // protect all predictions routes

router.get('/expenses', getExpenseForecast);
router.get('/budgets', getBudgetSuggestions);

module.exports = router;
