const User = require('../models/User');
const Opportunity = require('../models/Opportunity');

// @desc    Show user dashboard with stats, achievements, and relevant opportunities
// @route   GET /dashboard
exports.showDashboard = async (req, res, next) => {
  try {
    // Fetch user data, populating achievements
    const user = await User.findById(req.user._id)
      .populate('achievements.achievement') // Populate if achievements are refs
      .lean(); 

    if (!user) {
      req.logout(); // Log out if user not found
      return res.redirect('/');
    }

    // Fetch opportunities the user has attended to calculate accurate stats
    const attendedOpportunities = await Opportunity.find({ 
      attendees: req.user._id 
    }).lean();

    // --- DEBUG LOGGING START ---
    console.log(`[Dashboard] User: ${req.user._id} (${req.user.name})`);
    console.log(`[Dashboard] Found ${attendedOpportunities.length} attended opportunities.`);
    if (attendedOpportunities.length > 0) {
      console.log('[Dashboard] Attended Opportunities Details:', JSON.stringify(attendedOpportunities.map(o => ({ id: o._id, title: o.title, duration: o.duration, tag: o.tag })), null, 2));
    }
    // --- DEBUG LOGGING END ---

    // Reset and recalculate user stats based on actual attended opportunities
    let totalHours = 0;
    let eventsAttended = attendedOpportunities.length;
    let categoryPoints = {
      healthcare: 0,
      education: 0,
      environment: 0,
      community: 0,
      animals: 0,
      other: 0
    };

    // Count unique categories the user has volunteered in
    const uniqueCategories = new Set();

    // Calculate hours and points by category from opportunities
    attendedOpportunities.forEach(opportunity => {
      // Add hours from each opportunity
      const durationHours = opportunity.duration || 0;
      totalHours += durationHours;
      
      // Track categories user has helped
      if (opportunity.tag) {
        uniqueCategories.add(opportunity.tag);
      }
      
      // Calculate points based on duration (10 points per hour)
      const opportunityPoints = durationHours * 10;
      
      // Add points to the appropriate category
      if (opportunity.tag && categoryPoints[opportunity.tag] !== undefined) {
        categoryPoints[opportunity.tag] += opportunityPoints;
      } else {
        categoryPoints.other += opportunityPoints;
      }
    });

    // --- DEBUG LOGGING START ---
    console.log(`[Dashboard] Recalculated Stats: Events=${eventsAttended}, Hours=${totalHours}`);
    console.log('[Dashboard] Recalculated Category Points:', JSON.stringify(categoryPoints, null, 2));
    // --- DEBUG LOGGING END ---

    // Fetch relevant opportunities for display
    let opportunitiesQuery;
    if (user.role === 'organization') {
      // Organization: Show opportunities they created
      opportunitiesQuery = Opportunity.find({ createdBy: user._id });
    } else {
      // Volunteer: Show opportunities they are attending
      opportunitiesQuery = Opportunity.find({ attendees: user._id });
    }
    const opportunities = await opportunitiesQuery.sort({ dateTime: 'asc' }).lean();

    // Calculate total points from all categories
    const totalPoints = Object.values(categoryPoints).reduce((sum, points) => sum + points, 0);

    // Calculate rank info using the helper with recalculated points
    const rankInfo = req.app.locals.hbs.helpers.calculateRank(totalPoints);

    // Prepare category progress data from recalculated categoryPoints
    const categories = [
      { id: 'healthcare', name: 'Healer' },
      { id: 'education', name: 'Knowledge Sage' },
      { id: 'environment', name: 'Nature Guardian' },
      { id: 'community', name: 'Unity Weaver' },
      { id: 'animals', name: 'Beast Whisperer' },
      { id: 'other', name: 'Mystery Seeker' }
    ];

    let categoryProgressData = categories.map(category => {
      const points = categoryPoints[category.id] || 0;
      return {
        id: category.id,
        points: points,
        level: Math.floor(points / 50) + 1,
        percentage: Math.min(((points % 50) / 50) * 100, 100)
      };
    });

    // Sort by points descending and take top 4 with non-zero points
    categoryProgressData = categoryProgressData.filter(cat => cat.points > 0);
    categoryProgressData.sort((a, b) => b.points - a.points);
    const topCategoryProgress = categoryProgressData.slice(0, 4);

    // Prepare earned achievements data
    const earnedAchievements = user.achievements ? user.achievements.map(a => ({
        id: a.achievement?.id || a.id, 
        name: a.achievement?.name || a.name,
        icon: a.achievement?.icon || a.icon,
        earnedAt: a.earnedAt
    })) : [];

    // Prepare next/potential achievements data
    const potentialAchievementsConfig = require('../config/ranks').achievements;
    const earnedAchievementIds = new Set(earnedAchievements.map(a => a.id));
    const nextAchievements = potentialAchievementsConfig
      .filter(ach => !earnedAchievementIds.has(ach.id))
      .map(ach => {
        let progress = 0;
        // Calculate progress based on achievement criteria
        if (ach.id === 'hometown_hero') progress = Math.min(Math.floor((eventsAttended / 10) * 100), 99);
        else if (ach.id === 'dedication') progress = Math.min(Math.floor((totalHours / 50) * 100), 99);
        else if (ach.id === 'category_master') progress = Math.min(Math.floor((uniqueCategories.size / 5) * 100), 99);
        else progress = 0;
        
        return {
            id: ach.id,
            name: ach.name,
            icon: ach.icon || null,
            progress: progress
        };
      })
      .slice(0, 4);

    // Calculate overall level and XP for next level
    const currentLevel = Math.floor(totalPoints / 100) + 1;
    const nextLevelXP = currentLevel * 100;
    const currentLevelXP = (currentLevel - 1) * 100;
    const xpTowardsNextLevel = totalPoints - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
    const levelProgressPercent = xpNeededForNextLevel > 0 ? Math.min(Math.round((xpTowardsNextLevel / xpNeededForNextLevel) * 100), 100) : 0;

    res.render('dashboard', {
      layout: 'main',
      name: user.name,
      role: user.role,
      points: totalPoints, // Use recalculated total points
      stats: {
        eventsAttended: eventsAttended,
        totalHours: totalHours,
        currentStreak: user.stats?.currentStreak || 0,
        categoriesCount: uniqueCategories.size, // Count unique categories
        level: currentLevel
      },
      rankTier: rankInfo.tier,
      rankProgress: levelProgressPercent,
      pointsToNextRank: nextLevelXP - totalPoints,
      nextLevelXP: nextLevelXP,
      opportunities,
      attendedOpportunities,
      achievements: earnedAchievements,
      categoryProgress: topCategoryProgress,
      nextAchievements
    });

  } catch (err) {
    console.error('Error loading dashboard:', err);
    next(err);
  }
}; 