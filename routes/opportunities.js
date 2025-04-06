const express = require('express');
const router = express.Router();
const { ensureAuth, ensureOrganization } = require('../middleware/auth');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const opportunityController = require('../controllers/opportunityController');

// @desc    Redirect base /opportunities to the map view
// @route   GET /opportunities
router.get('/', (req, res) => {
  res.redirect('/map');
});

// @desc    Show add opportunity page
// @route   GET /opportunities/add
router.get('/add', ensureAuth, ensureOrganization, (req, res) => {
  res.render('opportunities/add');
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

// @desc    Handle the signup links that use GET method
// @route   GET /opportunities/:id/signup
router.get('/:id/signup', ensureAuth, async (req, res) => {
  try {
    // Redirect to the opportunity page with a signup prompt
    res.redirect(`/opportunities/${req.params.id}?join=true`);
  } catch (err) {
    console.error('Error in signup redirect:', err);
    res.status(500).render('error/500');
  }
});

// @desc    Allow authenticated user to attend an opportunity
// @route   PUT /opportunities/:id/attend
router.put('/:id/attend', ensureAuth, opportunityController.attendOpportunity);

// @desc    Show single opportunity details page
// @route   GET /opportunities/:id
router.get('/:id', opportunityController.showOpportunity);

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

module.exports = router; 