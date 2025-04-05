const express = require('express');
const router = express.Router();
const { ensureAuth } = require('../middleware/auth');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');

// Dashboard Route
router.get('/', ensureAuth, async (req, res) => {
  try {
    // Get user data and opportunities
    let opportunities;
    const user = await User.findById(req.user._id);
    
    if (user.role === 'organization') {
      opportunities = await Opportunity.find({ createdBy: req.user._id });
    } else {
      // For individuals, get the opportunities they're attending
      opportunities = await Opportunity.find({ attendees: req.user._id });
    }

    // Format opportunities with tag colors
    const formattedOpportunities = opportunities.map(opp => {
      const tagColorMap = {
        'healthcare': '#F87171',   // red
        'education': '#60A5FA',    // blue
        'environment': '#34D399',  // green
        'community': '#FBBF24',    // yellow
        'animals': '#A78BFA',      // purple
        'other': '#9CA3AF'         // gray
      };
      
      return {
        ...opp.toObject(),
        tagColor: tagColorMap[opp.tag] || tagColorMap.other
      };
    });

    // Calculate user's rank information
    const rankInfo = req.app.locals.hbs.helpers.calculateRank(user.points);
    
    // Generate name initials for avatar
    const nameParts = user.name.split(' ');
    const nameInitials = nameParts.length > 1 
      ? (nameParts[0][0] + nameParts[1][0]).toUpperCase() 
      : user.name.substring(0, 2).toUpperCase();
      
    // Format category progress
    const categoryProgress = [];
    const categories = [
      { id: 'healthcare', name: 'Healthcare', color: '#F87171' },
      { id: 'education', name: 'Education', color: '#60A5FA' },
      { id: 'environment', name: 'Environment', color: '#34D399' },
      { id: 'community', name: 'Community', color: '#FBBF24' },
      { id: 'animals', name: 'Animals', color: '#A78BFA' },
      { id: 'other', name: 'Other', color: '#9CA3AF' }
    ];
    
    // Find the weakest category for tips
    let minPoints = Infinity;
    let weakestCategory = '';
    
    categories.forEach(category => {
      const points = user.categoryPoints[category.id] || 0;
      
      if (points < minPoints && category.id !== 'other') {
        minPoints = points;
        weakestCategory = category.name;
      }
      
      categoryProgress.push({
        id: category.id,
        name: category.name,
        color: category.color,
        points: points,
        percentage: Math.min(Math.floor((points / 300) * 100), 100) // Max at 300 points per category
      });
    });
    
    // Format achievements progress for next achievements
    const nextAchievements = [];
    
    // Check if user already has first opportunity achievement
    if (!user.achievements.some(a => a.id === 'first_event')) {
      nextAchievements.push({
        name: 'First Step',
        progress: 0 // They haven't achieved it yet
      });
    }
    
    // Calculate progress to "Volunteer Hero" (attend 10 opportunities)
    if (!user.achievements.some(a => a.id === 'hometown_hero')) {
      const progress = Math.min(Math.floor((user.stats.eventsAttended / 10) * 100), 99);
      nextAchievements.push({
        name: 'Volunteer Hero',
        progress
      });
    }
    
    // Calculate progress to "Dedication" (100 hours)
    if (!user.achievements.some(a => a.id === 'dedication')) {
      const progress = Math.min(Math.floor((user.stats.totalHours / 100) * 100), 99);
      nextAchievements.push({
        name: 'Dedication',
        progress
      });
    }
    
    // Calculate progress to "Well Rounded" (all categories)
    if (!user.achievements.some(a => a.id === 'category_master')) {
      const categoryCount = Object.values(user.categoryPoints).filter(points => points > 0).length;
      const progress = Math.floor((categoryCount / 5) * 100); // 5 main categories excluding 'other'
      nextAchievements.push({
        name: 'Well Rounded',
        progress
      });
    }

    // Render dashboard with all the formatted data
    res.render('dashboard', {
      name: user.name,
      role: user.role,
      points: user.points,
      stats: {
        eventsAttended: user.stats?.eventsAttended || 0,
        totalHours: user.stats?.totalHours || 0,
        currentStreak: user.stats?.currentStreak || 0,
        level: Math.floor(user.points / 100) + 1 // Calculate level based on points (1 level per 100 points)
      },
      nameInitials,
      rankDisplay: `${rankInfo.tier}`,
      rankTier: rankInfo.tier,
      rankColor: rankInfo.color,
      rankIcon: `${rankInfo.tier.toLowerCase()}.png`,
      rankProgress: rankInfo.progress,
      pointsToNextRank: rankInfo.pointsToNext,
      nextRankTier: rankInfo.nextTier,
      nextLevelXP: (Math.floor(user.points / 100) + 1) * 100, // Next level XP threshold
      opportunities: formattedOpportunities,
      achievements: user.achievements || [],
      categoryProgress,
      nextAchievements,
      weakestCategory
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.render('dashboard', { error: 'Failed to load dashboard data' });
  }
});

module.exports = router; 