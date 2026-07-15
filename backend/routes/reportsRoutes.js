const express = require('express');
const {
  getDashboardReport,
  getMonthlyReport,
  getYearlyReport,
} = require('../controllers/reportsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // protect all reports routes

router.get('/dashboard', getDashboardReport);
router.get('/monthly', getMonthlyReport);
router.get('/yearly', getYearlyReport);

module.exports = router;
