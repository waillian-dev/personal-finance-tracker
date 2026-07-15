const express = require('express');
const {
  registerUser,
  loginUser,
  getMe,
  refreshSession,
  updateProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshSession);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
