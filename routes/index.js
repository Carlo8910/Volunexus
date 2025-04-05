const express = require('express');
const router = express.Router();
const { ensureAuth, ensureGuest } = require('../middleware/auth');
const Opportunity = require('../models/Opportunity');
const { enableTestMode } = require('../config/test-mode');

// @desc    Landing page
// @route   GET /
router.get('/', ensureGuest, (req, res) => {
  res.render('landing', {
    layout: 'landing',
    testMode: enableTestMode
  });
});

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
router.get('/map', async (req, res) => {
  try {
    let opportunities = [];
    
    if (!enableTestMode) {
      // If not in test mode, fetch real data from MongoDB
      opportunities = await Opportunity.find({})
        .sort({ dateTime: 'asc' })
        .lean();
    } else {
      // In test mode, use mock data
      console.log('Test mode: Using mock opportunities data for map');
      
      // Example mock opportunity data for testing map
      opportunities = [
        {
          _id: '111111111111111111111111',
          title: 'Test Opportunity 1',
          description: 'This is a test opportunity for the map view.',
          location: {
            address: '123 Main St, New York, NY',
            coordinates: {
              coordinates: [-74.006, 40.7128] // NYC coordinates (long, lat)
            }
          },
          dateTime: new Date(Date.now() + 86400000), // Tomorrow
          duration: 2,
          tag: 'education',
          createdBy: '123456789',
          attendees: []
        },
        {
          _id: '222222222222222222222222',
          title: 'Test Opportunity 2',
          description: 'This is another test opportunity for the map view.',
          location: {
            address: '456 Park Ave, New York, NY',
            coordinates: {
              coordinates: [-73.9664, 40.7629] // NYC coordinates (long, lat)
            }
          },
          dateTime: new Date(Date.now() + 172800000), // Day after tomorrow
          duration: 3,
          tag: 'environment',
          createdBy: '123456789',
          attendees: []
        }
      ];
    }
    
    res.render('map', {
      opportunities,
      mapApiKey: process.env.GOOGLE_MAPS_API_KEY,
      user: req.user || null,
      testMode: enableTestMode
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
    
    let users = [];
    
    if (!enableTestMode) {
      // If not in test mode, fetch real data from MongoDB
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
      users = await User.find({ 
        role: 'volunteer', 
        points: { $gt: 0 },
        ...dateFilter
      })
        .sort({ points: 'desc' })
        .limit(20)
        .lean();
    } else {
      // In test mode, use mock data
      console.log('Test mode: Using mock users data for leaderboard');
      
      // Example mock users data for testing leaderboard
      users = [
        { name: 'Test User 1', points: 500, _id: '111111111111111111111111' },
        { name: 'Test User 2', points: 350, _id: '222222222222222222222222' },
        { name: 'Test User 3', points: 200, _id: '333333333333333333333333' },
        { name: 'Test User', points: 100, _id: '123456789' } // The test user
      ];
    }
    
    res.render('leaderboard', {
      users,
      period,
      user: req.user || null,
      testMode: enableTestMode
    });
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

module.exports = router; 