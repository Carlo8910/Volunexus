const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  auth0Id: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['volunteer', 'organization'],
    default: 'volunteer'
  },
  points: {
    type: Number,
    default: 0
  },
  // Track points by category
  categoryPoints: {
    healthcare: {
      type: Number,
      default: 0
    },
    education: {
      type: Number,
      default: 0
    },
    environment: {
      type: Number,
      default: 0
    },
    community: {
      type: Number,
      default: 0
    },
    animals: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    }
  },
  // Track achievements earned
  achievements: [{
    id: String,
    name: String,
    earnedAt: {
      type: Date,
      default: Date.now
    },
    icon: String
  }],
  // Stats for profile
  stats: {
    totalHours: {
      type: Number,
      default: 0
    },
    eventsAttended: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    lastEventDate: {
      type: Date,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  attendedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity'
  }]
});

// Virtual for calculating current rank
UserSchema.virtual('rank').get(function() {
  // This will be calculated in routes using the ranks.js config
  return null;
});

// Method to add points and update category totals
UserSchema.methods.addPoints = function(points, category) {
  // Add to total points
  this.points += points;
  
  // Add to category points if specified
  if (category && this.categoryPoints[category] !== undefined) {
    this.categoryPoints[category] += points;
  } else {
    // Default to "other" if category doesn't match
    this.categoryPoints.other += points;
  }
  
  return this.save();
};

// Method to add an achievement
UserSchema.methods.addAchievement = function(achievement) {
  // Check if achievement already exists
  const exists = this.achievements.some(a => a.id === achievement.id);
  
  if (!exists) {
    this.achievements.push({
      id: achievement.id,
      name: achievement.name,
      earnedAt: new Date(),
      icon: achievement.icon
    });
    
    // Add achievement points if specified
    if (achievement.points) {
      this.points += achievement.points;
    }
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to update stats after attending an event
UserSchema.methods.updateStats = function(duration) {
  // Update total hours
  this.stats.totalHours += duration;
  
  // Increment events count
  this.stats.eventsAttended += 1;
  
  // Calculate streak
  const now = new Date();
  const lastEventDate = this.stats.lastEventDate;
  
  if (lastEventDate) {
    // Get days since last event
    const daysSinceLastEvent = Math.floor((now - lastEventDate) / (1000 * 60 * 60 * 24));
    
    // If it's been less than 8 days, continue streak
    if (daysSinceLastEvent < 8) {
      this.stats.currentStreak += 1;
    } else {
      // Reset streak
      this.stats.currentStreak = 1;
    }
  } else {
    // First event
    this.stats.currentStreak = 1;
  }
  
  // Update longest streak if needed
  if (this.stats.currentStreak > this.stats.longestStreak) {
    this.stats.longestStreak = this.stats.currentStreak;
  }
  
  // Update last event date
  this.stats.lastEventDate = now;
  
  return this.save();
};

module.exports = mongoose.model('User', UserSchema); 