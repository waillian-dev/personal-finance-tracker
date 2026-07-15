const express = require('express');
const {
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} = require('../controllers/recurringController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // Protect all recurring transaction routes

router.route('/')
  .get(getRecurring)
  .post(createRecurring);

router.route('/:id')
  .put(updateRecurring)
  .delete(deleteRecurring);

module.exports = router;
