const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');

// @desc    Auth with Auth0
// @route   GET /auth/login
router.get('/login', passport.authenticate('auth0', {
  scope: 'openid email profile'
}));

// @desc    Auth callback
// @route   GET /auth/callback
router.get('/callback', 
  passport.authenticate('auth0', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// @desc    Logout user
// @route   GET /auth/logout
router.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// @desc    Update user role
// @route   PUT /auth/role
router.put('/role', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const { role } = req.body;
    if (!['volunteer', 'organization'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    
    await User.findByIdAndUpdate(req.user.id, { role });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router; 