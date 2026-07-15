const express = require('express');
const {
  createLedgerTransaction,
  getLedgerTransactions,
  settleLedger,
  settleWithPayment,
} = require('../controllers/ledgerController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All ledger routes protected

router.route('/')
  .post(createLedgerTransaction);

router.route('/pay')
  .post(settleWithPayment);

router.route('/:friendId')
  .get(getLedgerTransactions);

router.route('/settle/:friendId')
  .post(settleLedger);

module.exports = router;
