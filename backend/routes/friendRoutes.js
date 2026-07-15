const express = require('express');
const {
  sendFriendRequest,
  getFriends,
  respondToFriendRequest,
} = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All friend routes protected

router.route('/')
  .get(getFriends);

router.route('/request')
  .post(sendFriendRequest);

router.route('/request/:id')
  .put(respondToFriendRequest);

module.exports = router;
