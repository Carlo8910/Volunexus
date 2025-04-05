const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');

// @desc    User profile page
// @route   GET /users/profile
router.get('/profile', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    
    // Get attended opportunities
    const attendedOpportunities = await Opportunity.find({
      attendees: req.user.id
    })
      .sort({ dateTime: 'desc' })
      .lean();
    
    res.render('users/profile', {
      user,
      attendedOpportunities
    });
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

// @desc    Get user points
// @route   GET /users/:id/points
router.get('/:id/points', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name points').lean();
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      data: {
        name: user.name,
        points: user.points
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 