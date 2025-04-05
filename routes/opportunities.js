const express = require('express');
const router = express.Router();
const { ensureAuth, ensureOrganization } = require('../middleware/auth');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');

// @desc    Show add opportunity page
// @route   GET /opportunities/add
router.get('/add', ensureAuth, ensureOrganization, (req, res) => {
  res.render('opportunities/add');
});

// @desc    Process add opportunity form
// @route   POST /opportunities
router.post('/', ensureAuth, ensureOrganization, async (req, res) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user.id;
    
    // Validate coordinates
    if (!req.body.coordinates || req.body.coordinates.length !== 2) {
      return res.render('error/400', {
        message: 'Invalid coordinates provided'
      });
    }
    
    // Format location data
    const opportunity = {
      title: req.body.title,
      description: req.body.description,
      location: {
        address: req.body.address,
        coordinates: {
          type: 'Point',
          coordinates: [parseFloat(req.body.coordinates[0]), parseFloat(req.body.coordinates[1])]
        }
      },
      dateTime: new Date(req.body.dateTime),
      duration: parseFloat(req.body.duration),
      tag: req.body.tag,
      createdBy: req.user.id
    };
    
    await Opportunity.create(opportunity);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

// @desc    Show single opportunity
// @route   GET /opportunities/:id
router.get('/:id', async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('createdBy', 'name')
      .lean();
    
    if (!opportunity) {
      return res.render('error/404');
    }
    
    // Check if user is attending
    let isAttending = false;
    if (req.user) {
      isAttending = opportunity.attendees.some(attendee => 
        attendee.toString() === req.user.id.toString()
      );
    }
    
    res.render('opportunities/show', {
      opportunity,
      isAttending,
      user: req.user || null
    });
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

// @desc    Show edit opportunity page
// @route   GET /opportunities/edit/:id
router.get('/edit/:id', ensureAuth, ensureOrganization, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id).lean();
    
    if (!opportunity) {
      return res.render('error/404');
    }
    
    // Check if user is the owner
    if (opportunity.createdBy.toString() !== req.user.id.toString()) {
      return res.render('error/403', {
        message: 'You are not authorized to edit this opportunity'
      });
    }
    
    res.render('opportunities/edit', {
      opportunity
    });
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

// @desc    Update opportunity
// @route   PUT /opportunities/:id
router.put('/:id', ensureAuth, ensureOrganization, async (req, res) => {
  try {
    let opportunity = await Opportunity.findById(req.params.id);
    
    if (!opportunity) {
      return res.render('error/404');
    }
    
    // Check if user is the owner
    if (opportunity.createdBy.toString() !== req.user.id.toString()) {
      return res.render('error/403', {
        message: 'You are not authorized to update this opportunity'
      });
    }
    
    // Format location data
    const updatedOpportunity = {
      title: req.body.title,
      description: req.body.description,
      location: {
        address: req.body.address,
        coordinates: {
          type: 'Point',
          coordinates: [parseFloat(req.body.coordinates[0]), parseFloat(req.body.coordinates[1])]
        }
      },
      dateTime: new Date(req.body.dateTime),
      duration: parseFloat(req.body.duration),
      tag: req.body.tag
    };
    
    opportunity = await Opportunity.findByIdAndUpdate(
      req.params.id,
      updatedOpportunity,
      { new: true, runValidators: true }
    );
    
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

// @desc    Delete opportunity
// @route   DELETE /opportunities/:id
router.delete('/:id', ensureAuth, ensureOrganization, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    
    if (!opportunity) {
      return res.render('error/404');
    }
    
    // Check if user is the owner
    if (opportunity.createdBy.toString() !== req.user.id.toString()) {
      return res.render('error/403', {
        message: 'You are not authorized to delete this opportunity'
      });
    }
    
    await opportunity.remove();
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('error/500');
  }
});

// @desc    Attend opportunity
// @route   PUT /opportunities/attend/:id
router.put('/attend/:id', ensureAuth, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }
    
    // Check if user is already attending
    const isAttending = opportunity.attendees.includes(req.user.id);
    
    if (isAttending) {
      return res.status(400).json({ success: false, message: 'Already attending this opportunity' });
    }
    
    // Add user to attendees
    opportunity.attendees.push(req.user.id);
    await opportunity.save();
    
    // Load gameification config
    const { achievements } = require('../config/ranks');
    
    // Add opportunity to user's attended events and update points
    const user = await User.findById(req.user.id);
    
    // Add to attended events
    user.attendedEvents.push(opportunity.id);
    
    // Update stats
    await user.updateStats(opportunity.duration);
    
    // Add points with category
    await user.addPoints(opportunity.duration * 10, opportunity.tag);
    
    // Check and add achievements
    // First event achievement
    if (user.stats.eventsAttended === 1) {
      const firstEventAchievement = achievements.find(a => a.id === 'first_event');
      if (firstEventAchievement) {
        await user.addAchievement(firstEventAchievement);
      }
    }
    
    // Category master achievement - check if they've done all categories
    const uniqueCategories = new Set();
    // Get attended events with populated data
    const attendedOpportunities = await Opportunity.find({
      _id: { $in: user.attendedEvents }
    }).select('tag');
    
    // Count unique categories
    attendedOpportunities.forEach(op => {
      if (op.tag) uniqueCategories.add(op.tag);
    });
    
    if (uniqueCategories.size >= 5) {
      const categoryMasterAchievement = achievements.find(a => a.id === 'category_master');
      if (categoryMasterAchievement) {
        await user.addAchievement(categoryMasterAchievement);
      }
    }
    
    // Hometown hero achievement - 10 events
    if (user.stats.eventsAttended >= 10) {
      const hometownHeroAchievement = achievements.find(a => a.id === 'hometown_hero');
      if (hometownHeroAchievement) {
        await user.addAchievement(hometownHeroAchievement);
      }
    }
    
    // Dedication achievement - 100 hours
    if (user.stats.totalHours >= 100) {
      const dedicationAchievement = achievements.find(a => a.id === 'dedication');
      if (dedicationAchievement) {
        await user.addAchievement(dedicationAchievement);
      }
    }
    
    // Consistent helper achievement - streak of 4 (weekly for a month)
    if (user.stats.currentStreak >= 4) {
      const consistentHelperAchievement = achievements.find(a => a.id === 'consistent_helper');
      if (consistentHelperAchievement) {
        await user.addAchievement(consistentHelperAchievement);
      }
    }
    
    res.redirect(`/opportunities/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get opportunities near location
// @route   GET /opportunities/near?lat=X&lng=Y&maxDistance=Z
router.get('/near', async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10000 } = req.query; // maxDistance in meters, default 10km
    
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }
    
    const opportunities = await Opportunity.find({
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).lean();
    
    res.json({ success: true, data: opportunities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 