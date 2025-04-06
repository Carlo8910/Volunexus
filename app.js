const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const { engine } = require('express-handlebars');
const passport = require('passport');
const connectDB = require('./config/db');
const configureAuth0 = require('./config/auth0');
const hbsHelpers = require('./config/handlebars-helpers');
const exphbs = require('express-handlebars');
const moment = require('moment');
const flash = require('connect-flash');

// Test mode configuration
const { enableTestMode, mockAuth, mockConfigureAuth0 } = require('./config/test-mode');

// Load environment variables
dotenv.config({ path: './config/.env' });

// DEBUG: Check loaded Auth0 domain
console.log(`DEBUG: Loaded AUTH0_DOMAIN = [${process.env.AUTH0_DOMAIN}]`); 

// Connect to database
connectDB();

// Initialize Express app
const app = express();

// Body parser middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Method override middleware
app.use(methodOverride('_method'));

// Cookie parser middleware
app.use(cookieParser());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Flash messages middleware
app.use(flash());

// Set global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

// Helper functions for Handlebars (Defined inline below)
const hbs = exphbs.create({
  helpers: {
    eq: function (a, b) {
      return a === b;
    },
    formatDate: function (date, format) {
      return moment(date).format(format);
    },
    multiply: function(a, b) {
      return a * b;
    },
    json: function(context) {
      return JSON.stringify(context);
    },
    toLowerCase: function(str) {
      return str ? str.toLowerCase() : '';
    },
    uppercase: function(str) {
      return str ? str.toUpperCase() : '';
    },
    firstChar: function(str) {
      return str ? str.charAt(0) : '';
    },
    darkenColor: function(color) {
      // Returns a darker variant of the color name for borders
      const colorMap = {
        'green': 'green',
        'blue': 'blue',
        'purple': 'purple',
        'yellow': 'yellow',
        'red': 'red',
        'gray': 'gray'
      };
      return colorMap[color] || 'gray';
    },
    mapCategoryColor: function(category) {
      // Maps category IDs to color names for styling
      const categoryColorMap = {
        'healthcare': 'red',
        'education': 'blue',
        'environment': 'green',
        'community': 'purple',
        'animals': 'yellow',
        'other': 'gray'
      };
      return categoryColorMap[category] || 'gray';
    },
    mapCategoryIcon: function(category) {
      // Maps category IDs to FontAwesome icon classes
      const categoryIconMap = {
        'healthcare': 'fas fa-heart',
        'education': 'fas fa-graduation-cap',
        'environment': 'fas fa-tree',
        'community': 'fas fa-users',
        'animals': 'fas fa-paw',
        'other': 'fas fa-circle'
      };
      return categoryIconMap[category] || 'fas fa-circle';
    },
    mapCategoryName: function(category) {
      // Maps category IDs to display names with gaming theme
      const categoryNameMap = {
        'healthcare': 'Healer',
        'education': 'Knowledge Sage',
        'environment': 'Nature Guardian',
        'community': 'Unity Weaver',
        'animals': 'Beast Whisperer',
        'other': 'Mystery Seeker'
      };
      return categoryNameMap[category] || 'Mystery Seeker';
    },
    mapCategoryLevelIcon: function(category) {
      // Maps category IDs to level icon classes
      const categoryLevelIconMap = {
        'healthcare': 'fas fa-heartbeat',
        'education': 'fas fa-book',
        'environment': 'fas fa-leaf',
        'community': 'fas fa-hands-helping',
        'animals': 'fas fa-feather',
        'other': 'fas fa-star'
      };
      return categoryLevelIconMap[category] || 'fas fa-star';
    },
    mapCategoryLevel: function(points) {
      // Calculate level based on points (1 level per 50 points)
      return Math.floor(points / 50) + 1;
    },
    mapAchievementIcon: function(id) {
      // Maps achievement IDs to FontAwesome icon classes
      const achievementIconMap = {
        'first_event': 'fas fa-seedling',
        'hometown_hero': 'fas fa-award',
        'dedication': 'fas fa-hourglass',
        'category_master': 'fas fa-palette',
        'streaker': 'fas fa-fire',
        'night_owl': 'fas fa-moon',
        'early_bird': 'fas fa-sun'
      };
      return achievementIconMap[id] || 'fas fa-medal';
    },
    mapAchievementColor: function(id) {
      // Maps achievement IDs to background color names
      const achievementColorMap = {
        'first_event': 'green',
        'hometown_hero': 'purple',
        'dedication': 'blue',
        'category_master': 'yellow',
        'streaker': 'red',
        'night_owl': 'indigo',
        'early_bird': 'orange'
      };
      return achievementColorMap[id] || 'gray';
    },
    mapAchievementIconColor: function(id) {
      // Maps achievement IDs to icon color names
      const achievementIconColorMap = {
        'first_event': 'green',
        'hometown_hero': 'purple',
        'dedication': 'blue',
        'category_master': 'yellow',
        'streaker': 'red',
        'night_owl': 'indigo',
        'early_bird': 'orange'
      };
      return achievementIconColorMap[id] || 'gray';
    },
    calculateRank: function(points) {
      // League of Legends inspired rank system
      const ranks = [
        { tier: "Bronze", threshold: 0, color: "#CD7F32" },
        { tier: "Silver", threshold: 100, color: "#C0C0C0" },
        { tier: "Gold", threshold: 300, color: "#FFD700" },
        { tier: "Platinum", threshold: 600, color: "#00FFBF" },
        { tier: "Diamond", threshold: 1000, color: "#B9F2FF" },
        { tier: "Master", threshold: 1500, color: "#9678D2" },
        { tier: "Grandmaster", threshold: 2000, color: "#FF4E50" },
        { tier: "Challenger", threshold: 3000, color: "#00BFFF" }
      ];
      
      // Find current rank
      let currentRank = ranks[0];
      let nextRank = ranks[1];
      
      for (let i = ranks.length - 1; i >= 0; i--) {
        if (points >= ranks[i].threshold) {
          currentRank = ranks[i];
          nextRank = ranks[i+1] || ranks[i];
          break;
        }
      }
      
      // Calculate progress to next rank
      const pointsInCurrentTier = points - currentRank.threshold;
      const pointsToNextTier = nextRank.threshold - currentRank.threshold;
      const progress = Math.min(Math.round((pointsInCurrentTier / pointsToNextTier) * 100), 100);
      
      return {
        tier: currentRank.tier,
        color: currentRank.color,
        nextTier: nextRank.tier,
        progress: progress,
        pointsToNext: nextRank.threshold - points
      };
    },
    addOne: function (index) {
      return index + 1;
    },
  },
  defaultLayout: 'main',
  extname: '.hbs'
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', './views');

// Make hbs available to routes
app.locals.hbs = hbs;

// Static folder
app.use(express.static(path.join(__dirname, 'public')));

if (enableTestMode) {
  // Use test mode (bypass Auth0)
  console.log('⚠️ Running in TEST MODE - Auth0 authentication is bypassed');
  app.use(mockAuth);
  mockConfigureAuth0();
} else {
  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Auth0
  configureAuth0();
}

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const opportunityRoutes = require('./routes/opportunities');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');

// Use routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/opportunities', opportunityRoutes);
app.use('/users', userRoutes);
app.use('/dashboard', dashboardRoutes);

// Port configuration
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
}); 