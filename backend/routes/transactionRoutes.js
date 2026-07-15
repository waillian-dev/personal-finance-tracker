const express = require('express');
const {
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  getTransactionById,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // protect all transaction routes

router.route('/')
  .get(getTransactions)
  .post(createTransaction);

router.route('/:id')
  .get(getTransactionById)
  .put(updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
