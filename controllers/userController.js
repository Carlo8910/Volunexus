const User = require('../models/User');
const Opportunity = require('../models/Opportunity');

// @desc    Show logged-in user's profile page
// @route   GET /users/profile
exports.showUserProfile = async (req, res, next) => {
  try {
    // Assuming ensureAuth provides req.user
    const user = await User.findById(req.user._id)
      // Populate achievements if they are references (adjust path if needed)
      // .populate('achievements.achievement')
      .lean();

    if (!user) {
      // Should not happen if ensureAuth is working, but good practice
      console.warn(`User not found for ID: ${req.user._id} in showUserProfile`);
      req.logout((err) => { // Use logout callback
        if (err) return next(err);
        res.redirect('/');
      });
      return; // Prevent further execution
    }

    // Get opportunities the user has attended
    const attendedOpportunities = await Opportunity.find({ attendees: req.user._id })
      .sort({ dateTime: 'desc' }) // Show most recent first
      .lean();

    // TODO: Add logic to calculate stats/rank/achievements for profile view if needed,
    // similar to dashboardController, or pass the full user object if the template handles it.

    res.render('profile', { // Assuming the view is named 'profile.hbs' in the 'views' directory
      layout: 'main', // Specify layout if not default
      profileUser: user, // Pass the fetched user object (use a different name than res.locals.user)
      attendedOpportunities,
      user: req.user // Pass the logged-in user for layout/header context
    });
  } catch (err) {
    console.error('Error loading user profile:', err);
    next(err); // Pass to central error handler
  }
};

// @desc    Get public points data for a user (API endpoint)
// @route   GET /users/:id/points
exports.getUserPoints = async (req, res, next) => {
  try {
    const userId = req.params.id;
    // Validate if the ID is a valid MongoDB ObjectId format (optional but recommended)
    if (!mongoose.Types.ObjectId.isValid(userId)) {
         return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId)
      .select('name points') // Only select public data
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        name: user.name,
        points: user.points || 0 // Default to 0 if points are missing
      }
    });
  } catch (err) {
    console.error('Error getting user points:', err);
    // Avoid sending detailed errors in production for API endpoints
    res.status(500).json({ success: false, message: 'Server error retrieving user points' });
    // Do not call next(err) here as we've already sent a JSON response
  }
};