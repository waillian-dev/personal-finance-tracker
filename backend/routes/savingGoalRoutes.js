const express = require('express');
const {
  getSavingGoals,
  createSavingGoal,
  getSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
  addSavings,
  withdrawSavings,
} = require('../controllers/savingGoalController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // protect all saving goal endpoints

router.route('/')
  .get(getSavingGoals)
  .post(createSavingGoal);

router.route('/:id')
  .get(getSavingGoal)
  .put(updateSavingGoal)
  .delete(deleteSavingGoal);

router.route('/:id/add-savings')
  .post(addSavings);

router.route('/:id/withdraw-savings')
  .post(withdrawSavings);

module.exports = router;
