const Friendship = require('../models/Friendship');
const User = require('../models/User');
const LedgerTransaction = require('../models/LedgerTransaction');

// @desc    Send a friend request by email
// @route   POST /api/friends/request
// @access  Private
const sendFriendRequest = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Please provide an email address' });
    }

    const recipient = await User.findOne({ email: email.toLowerCase().trim() });

    if (!recipient) {
      return res.status(404).json({ success: false, error: 'User with this email not found' });
    }

    if (recipient._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot add yourself as a friend' });
    }

    // Check if friendship already exists in either direction
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: recipient._id },
        { requester: recipient._id, recipient: req.user.id },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'pending') {
        return res.status(400).json({ success: false, error: 'Friend request is already pending' });
      }
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({ success: false, error: 'You are already friends with this user' });
      }
      // If rejected, allow re-requesting by setting back to pending and requester to current user
      existingFriendship.requester = req.user.id;
      existingFriendship.recipient = recipient._id;
      existingFriendship.status = 'pending';
      await existingFriendship.save();
      return res.json({ success: true, message: 'Friend request sent', data: existingFriendship });
    }

    const friendship = await Friendship.create({
      requester: req.user.id,
      recipient: recipient._id,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Friend request sent',
      data: friendship,
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all friends & pending requests with ledger summaries
// @route   GET /api/friends
// @access  Private
const getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [{ requester: req.user.id }, { recipient: req.user.id }],
    })
      .populate('requester', 'name email')
      .populate('recipient', 'name email');

    const accepted = [];
    const pendingIncoming = [];
    const pendingOutgoing = [];

    for (const f of friendships) {
      const isRequester = f.requester._id.toString() === req.user.id;
      const friendData = isRequester ? f.recipient : f.requester;

      if (f.status === 'accepted') {
        // Calculate ledger net balance
        // net balance = (sum paid by me) - (sum owed by me)
        const paidByMe = await LedgerTransaction.aggregate([
          { $match: { paidBy: req.user._id, owedBy: friendData._id, settled: false } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const owedByMe = await LedgerTransaction.aggregate([
          { $match: { paidBy: friendData._id, owedBy: req.user._id, settled: false } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const mePaidTotal = paidByMe.length > 0 ? paidByMe[0].total : 0;
        const meOwedTotal = owedByMe.length > 0 ? owedByMe[0].total : 0;
        const netBalance = mePaidTotal - meOwedTotal;

        accepted.push({
          friendshipId: f._id,
          friend: friendData,
          netBalance,
        });
      } else if (f.status === 'pending') {
        if (isRequester) {
          pendingOutgoing.push({
            friendshipId: f._id,
            friend: friendData,
          });
        } else {
          pendingIncoming.push({
            friendshipId: f._id,
            friend: friendData,
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        friends: accepted,
        pendingIncoming,
        pendingOutgoing,
      },
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Respond to friend request (accept/reject)
// @route   PUT /api/friends/request/:id
// @access  Private
const respondToFriendRequest = async (req, res) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status response' });
    }

    const friendship = await Friendship.findById(req.params.id);

    if (!friendship) {
      return res.status(404).json({ success: false, error: 'Friend request not found' });
    }

    if (friendship.recipient.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to respond to this request' });
    }

    friendship.status = status;
    await friendship.save();

    res.json({
      success: true,
      message: `Friend request ${status}`,
      data: friendship,
    });
  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  sendFriendRequest,
  getFriends,
  respondToFriendRequest,
};
