const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const { achievements } = require('../config/ranks'); // Load gamification config
const mongoose = require('mongoose');

// @desc    Show single opportunity
// @route   GET /opportunities/:id
exports.showOpportunity = async (req, res, next) => {
  try {
    // Fetch the opportunity, optionally populating creator name
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('createdBy', 'name')
      .lean(); // Use .lean() for plain JS objects if not modifying

    if (!opportunity) {
      // Pass a specific 404 error to the error handler
      const error = new Error('Opportunity not found');
      error.status = 404;
      return next(error);
    }

    // Check if the current user (if logged in) is attending
    let isAttending = false;
    if (req.user && opportunity.attendees && Array.isArray(opportunity.attendees)) {
       // Ensure attendees is an array before using .some
      isAttending = opportunity.attendees.some(attendeeId =>
        attendeeId.toString() === req.user._id.toString()
      );
    }

    // Simplify coordinate data for the view if needed
    let displayCoordinates = null;
    if (opportunity.location && opportunity.location.coordinates && opportunity.location.coordinates.coordinates) {
        displayCoordinates = {
            lng: opportunity.location.coordinates.coordinates[0],
            lat: opportunity.location.coordinates.coordinates[1]
        };
    }

    res.render('opportunities/show', {
      opportunity: { // Pass a potentially transformed opportunity object
        ...opportunity,
        // Overwrite coordinates with the simplified lat/lng object
        coordinates: displayCoordinates,
        // Ensure location.address exists for the template
        locationAddress: opportunity.location ? opportunity.location.address : 'No address provided'
      },
      isAttending,
      // Pass mapApiKey only if needed by this view
      mapApiKey: process.env.GOOGLE_MAPS_API_KEY || null,
      // Ensure user object is available for the template
      user: req.user || null
    });
  } catch (err) {
    console.error('Error in showOpportunity controller:', err);
    next(err); // Pass error to the central error handler
  }
};

// @desc    Attend an opportunity
// @route   PUT /opportunities/:id/attend
exports.attendOpportunity = async (req, res, next) => {
  try {
    const opportunityId = req.params.id;
    const userId = req.user._id; // Assuming user is authenticated via ensureAuth

    const opportunity = await Opportunity.findById(opportunityId);

    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    // Check if user is already attending
    if (opportunity.attendees.includes(userId)) {
      return res.status(400).json({ success: false, message: 'You are already attending this opportunity' });
    }

    // Add user to attendees and save opportunity
    opportunity.attendees.push(userId);
    await opportunity.save();

    // --- Gamification Logic ---
    const user = await User.findById(userId);
    if (!user) {
      // This shouldn't happen if ensureAuth is working, but good to check
      console.error(`User ${userId} not found during attend action for opportunity ${opportunityId}`);
      // Maybe revert the attend action or just return error
      return res.status(404).json({ success: false, message: 'User performing action not found' });
    }

    // Add opportunity to user's attended events list
    if (!user.attendedEvents.includes(opportunity._id)) {
        user.attendedEvents.push(opportunity._id);
    }

    // Update user stats (total hours, events attended, streak)
    // Ensure duration is a valid number
    const durationHours = typeof opportunity.duration === 'number' ? opportunity.duration : 0;
    await user.updateStats(durationHours);

    // Add points based on duration, including category
    const pointsEarned = durationHours * 10; // Example: 10 points per hour
    await user.addPoints(pointsEarned, opportunity.tag);

    // --- Check for Achievements ---
    const newlyEarnedAchievementsInfo = [];

    // Load achievement configuration
    const achievementConfig = require('../config/ranks').achievements;

    // Helper function to check and add achievement
    const checkAndGrantAchievement = async (achievementId) => {
      const achievement = achievementConfig.find(a => a.id === achievementId);
      if (achievement) {
        const earned = await user.addAchievement(achievement); // addAchievement should handle points and save
        if (earned) { // Check if it was newly earned (addAchievement should return truthy if new)
          newlyEarnedAchievementsInfo.push({ name: achievement.name, icon: achievement.icon || null });
        }
      }
    };

    // 1. First Event Achievement
    if (user.stats.eventsAttended === 1) {
      await checkAndGrantAchievement('first_event');
    }

    // 2. Category Master Achievement (Example: Attended at least one in 5 different categories)
    const attendedOpps = await Opportunity.find({ _id: { $in: user.attendedEvents } }).select('tag').lean();
    const uniqueCategories = new Set(attendedOpps.map(opp => opp.tag).filter(tag => tag && tag !== 'other')); // Exclude 'other'
    if (uniqueCategories.size >= 5) { // Check against number of primary categories
        await checkAndGrantAchievement('category_master');
    }

    // 3. Hometown Hero Achievement (Example: 10 events attended)
    if (user.stats.eventsAttended >= 10) {
       await checkAndGrantAchievement('hometown_hero');
    }

    // 4. Dedication Achievement (Example: 50 total hours)
    if (user.stats.totalHours >= 50) {
        await checkAndGrantAchievement('dedication');
    }

    // Add more achievement checks here...
    // 5. Streaker (Example: 5 day streak)
    // if (user.stats.currentStreak >= 5) {
    //     await checkAndGrantAchievement('streaker');
    // }
    // ... Night Owl, Early Bird based on opportunity.dateTime time ...

    // Final save for the user *might* be redundant if addAchievement saves, review User model method
    // await user.save(); // Only needed if addAchievement doesn't save itself

    res.status(200).json({
      success: true,
      message: 'Successfully registered for the opportunity!',
      pointsEarned: pointsEarned,
      newAchievements: newlyEarnedAchievementsInfo // Send back info about newly earned achievements
    });

  } catch (err) {
    console.error('Error in attendOpportunity controller:', err);
    // Ensure JSON response for API-like route
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error while attending opportunity' });
    }
    // Do not call next(err) here if already sending JSON response,
    // otherwise Express tries to send headers again.
    // Only call next if you want the central HTML error handler to take over.
  }
};