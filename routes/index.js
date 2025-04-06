const express = require('express');
const router = express.Router();
const { ensureAuth, ensureGuest } = require('../middleware/auth');
const Opportunity = require('../models/Opportunity');
const { enableTestMode } = require('../config/test-mode');
const indexController = require('../controllers/indexController');

// @desc    Landing page
// @route   GET /
router.get('/', ensureGuest, indexController.showLandingPage);

// @desc    Dashboard (legacy route)
// @route   GET /dashboard
router.get('/dashboard', ensureAuth, async (req, res) => {
  try {
    let opportunities = [];
    
    if (!enableTestMode) {
      // If not in test mode, fetch real data from MongoDB
      if (req.user.role === 'organization') {
        // Get opportunities created by this organization
        opportunities = await Opportunity.find({ createdBy: req.user.id })
          .sort({ dateTime: 'asc' })
          .lean();
      } else {
        // Get opportunities this volunteer is attending
        opportunities = await Opportunity.find({ 
          attendees: req.user.id 
        })
          .sort({ dateTime: 'asc' })
          .lean();
      }
    } else {
      // In test mode, use mock data
      console.log('Test mode: Using mock opportunities data for dashboard');
    }

    res.render('dashboard', {
      name: req.user.name,
      role: req.user.role,
      points: req.user.points,
      opportunities,
      testMode: enableTestMode
    });
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

// @desc    Map page
// @route   GET /map
router.get('/map', indexController.showMapPage);

// @desc    Leaderboard page
// @route   GET /leaderboard
router.get('/leaderboard', indexController.showLeaderboard);

module.exports = router; 