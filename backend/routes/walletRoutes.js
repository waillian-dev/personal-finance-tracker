const express = require('express');
const {
  getWallets,
  createWallet,
  updateWallet,
  deleteWallet,
} = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // protect all wallet routes

router.route('/')
  .get(getWallets)
  .post(createWallet);

router.route('/:id')
  .put(updateWallet)
  .delete(deleteWallet);

module.exports = router;
