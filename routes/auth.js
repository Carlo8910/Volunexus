const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');
const { enableTestMode } = require('../config/test-mode');

// @desc    Auth with Auth0
// @route   GET /auth/login
router.get('/login', function(req, res, next) {
  // If in test mode, bypass Auth0 and redirect to dashboard
  if (enableTestMode) {
    console.log('Test mode: Auth0 login bypassed');
    return res.redirect('/dashboard');
  }
  // Otherwise use Auth0 authentication
  passport.authenticate('auth0', {
    scope: 'openid email profile'
  })(req, res, next);
});

// @desc    Auth callback
// @route   GET /auth/callback
router.get(
  '/callback', // The path
  (req, res, next) => {
    // Middleware to bypass Passport if in test mode
    if (enableTestMode) {
      console.log('Test mode: Auth0 callback bypassed, redirecting');
      // In test mode, req.user should already be set by mockAuth middleware
      return res.redirect('/dashboard'); // Skip passport authentication
    }
    // Proceed to passport middleware if not in test mode
    next();
  },
  passport.authenticate('auth0', {
    // Optional: Add flash messages for failure feedback
    // failureFlash: 'Authentication failed. Please try again.',
    failureRedirect: '/' // Redirect to landing page on authentication failure
  }),
  // This function only runs if passport.authenticate succeeds
  (req, res, next) => {
    // Successful authentication, req.user is now available.
    console.log('Auth0 callback successful, redirecting to /dashboard');
    // You could add logic here, e.g., check if user profile is complete
    res.redirect('/dashboard'); // Redirect to the main application dashboard
  }
);

// @desc    Logout user
// @route   GET /auth/logout
router.get('/logout', (req, res) => {
  if (enableTestMode) {
    console.log('Test mode: Logout bypassed');
    return res.redirect('/');
  }
  
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// @desc    Update user role
// @route   PUT /auth/role
router.put('/role', async (req, res) => {
  try {
    if (!enableTestMode && !req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { role } = req.body;
    if (!['volunteer', 'organization'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    
    if (enableTestMode) {
      // In test mode, just update the test user's role in memory
      req.user.role = role;
      console.log(`Test mode: User role changed to ${role}`);
    } else {
      // In normal mode, update the role in the database
      await User.findByIdAndUpdate(req.user.id, { role });
    }
    
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 