const express = require('express');
const router = express.Router();
const { ensureAuth, ensureGuest } = require('../middleware/auth');
const Opportunity = require('../models/Opportunity');

// @desc    Landing page
// @route   GET /
router.get('/', ensureGuest, (req, res) => {
  res.render('landing', {
    layout: 'landing'
  });
});

// @desc    Dashboard
// @route   GET /dashboard
router.get('/dashboard', ensureAuth, async (req, res) => {
  try {
    let opportunities;
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

    res.render('dashboard', {
      name: req.user.name,
      role: req.user.role,
      points: req.user.points,
      opportunities
    });
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

// @desc    Map page
// @route   GET /map
router.get('/map', async (req, res) => {
  try {
    const opportunities = await Opportunity.find({})
      .sort({ dateTime: 'asc' })
      .lean();
    
    res.render('map', {
      opportunities,
      mapApiKey: process.env.GOOGLE_MAPS_API_KEY,
      user: req.user || null
    });
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

// @desc    Leaderboard page
// @route   GET /leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    // Period can be 'all', 'week', 'month', 'year'
    const period = req.query.period || 'all';
    
    let dateFilter = {};
    const now = new Date();
    
    if (period === 'week') {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      dateFilter = { createdAt: { $gte: oneWeekAgo } };
    } else if (period === 'month') {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);
      dateFilter = { createdAt: { $gte: oneMonthAgo } };
    } else if (period === 'year') {
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      dateFilter = { createdAt: { $gte: oneYearAgo } };
    }
    
    const User = require('../models/User');
    const users = await User.find({ 
      role: 'volunteer', 
      points: { $gt: 0 },
      ...dateFilter
    })
      .sort({ points: 'desc' })
      .limit(20)
      .lean();
    
    res.render('leaderboard', {
      users,
      period,
      user: req.user || null
    });
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

module.exports = router; 