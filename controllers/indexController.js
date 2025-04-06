const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const { enableTestMode } = require('../config/test-mode');

// @desc    Show landing page
// @route   GET /
exports.showLandingPage = (req, res) => {
  // EnsureGuest middleware should handle redirecting authenticated users
  res.render('landing', {
    layout: 'landing',
    testMode: enableTestMode // Pass test mode status to the view
  });
};

// @desc    Show map page with opportunities
// @route   GET /map
exports.showMapPage = async (req, res, next) => {
  // REMOVED DEBUG log
  // console.log('DEBUG (Server): Entered showMapPage function for /map'); 
  try {
    // Always fetch opportunities from the database, regardless of test mode
    console.log('Fetching opportunities from database for map view...');
    let opportunities = await Opportunity.find({})
      .select('title description location.address location.coordinates dateTime tag duration') // Select fields needed, including duration
      .sort({ dateTime: 'asc' })
      .lean();

    // Transform coordinates and ensure necessary fields are present
    opportunities = opportunities.map(opp => {
       let coords = null;
       if (opp.location && opp.location.coordinates && opp.location.coordinates.coordinates) {
           coords = {
               lng: opp.location.coordinates.coordinates[0],
               lat: opp.location.coordinates.coordinates[1]
           };
       }
       return {
           _id: opp._id,
           title: opp.title,
           description: opp.description || '', // Include description, default to empty string
           location: opp.location ? opp.location.address : 'No address',
           coordinates: coords,
           dateTime: opp.dateTime,
           tag: opp.tag,
           duration: opp.duration || 0 // Include duration field, default to 0 if missing
       };
    });

    console.log(`Rendering map with ${opportunities.length} processed opportunities from database.`);

    // Explicitly stringify the processed array
    const opportunitiesJsonString = JSON.stringify(opportunities);

    // REMOVED DEBUG log
    // console.log('DEBUG (Server): opportunitiesJsonString being sent to template:', opportunitiesJsonString);

    res.render('map', {
      opportunities: opportunitiesJsonString, // Pass the stringified JSON
      mapApiKey: process.env.GOOGLE_MAPS_API_KEY,
      // User will be the mock user if in test mode, or null/real user otherwise
      user: req.user || null,
      testMode: enableTestMode // Still useful to pass testMode status to view if needed for UI tweaks
    });
  } catch (err) {
    console.error('Error fetching opportunities for map:', err);
    next(err); // Pass to error handler
  }
};

// @desc    Show leaderboard page
// @route   GET /leaderboard
exports.showLeaderboard = async (req, res, next) => {
  try {
    // Period filtering logic (can be extracted to a utility function later)
    const period = req.query.period || 'all';
    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      let startDate;
      if (period === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (period === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      } else if (period === 'year') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      }
      if (startDate) {
        // This filter assumes you track points accrual time or use user creation time
        // If filtering based on user points directly, this date filter might not apply as intended
        // Consider adding a 'lastActive' or similar field if period-based points are needed
        // dateFilter = { pointsLastUpdated: { $gte: startDate } };
        // For now, filtering by user creation date as an example, adjust if needed
        dateFilter = { createdAt: { $gte: startDate } };
      }
    }

    let users = [];
    if (!enableTestMode) {
      // Fetch top volunteers (adjust query as needed)
      users = await User.find({
        role: 'volunteer', // Only volunteers on leaderboard
        points: { $gt: 0 }, // Only users with points
        ...dateFilter // Apply date filter if period is specified
      })
        .sort({ points: -1 }) // Sort by points descending
        .limit(20) // Limit to top 20
        .select('name points') // Select necessary fields (add profilePicture if needed)
        .lean();
    } else {
      // Mock data for leaderboard in test mode
      console.log('Test mode: Using mock users data for leaderboard');
      users = [
        { name: 'Test User 1', points: 500, _id: '111111111111111111111111' },
        { name: 'Test User 2', points: 350, _id: '222222222222222222222222' },
        { name: 'Test User 3', points: 200, _id: '333333333333333333333333' },
        { name: 'Test User', points: 100, _id: '123456789' } // Mock of the current test user
      ];
    }

    res.render('leaderboard', {
      users,
      period, // Pass period back for highlighting active filter
      user: req.user || null,
      testMode: enableTestMode
    });
  } catch (err) {
    console.error('Error fetching leaderboard data:', err);
    next(err); // Pass to error handler
  }
};