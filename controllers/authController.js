const passport = require('passport');
const User = require('../models/User');
const { enableTestMode } = require('../config/test-mode');

// @desc    Initiate Auth0 login
// @route   GET /auth/login
exports.login = (req, res, next) => {
  if (enableTestMode) {
    console.log('Test mode: Auth0 login bypassed, redirecting to dashboard');
    return res.redirect('/dashboard'); // Redirect directly if test mode
  }
  passport.authenticate('auth0', { scope: 'openid email profile' })(req, res, next);
};

// @desc    Auth0 callback processing
// @route   GET /auth/callback
exports.callback = (req, res, next) => {
  if (enableTestMode) {
    console.log('Test mode: Auth0 callback bypassed, redirecting to dashboard');
    return res.redirect('/dashboard'); // Redirect directly if test mode
  }
  passport.authenticate('auth0', (err, user, info) => {
    if (err) { 
      console.error('Auth0 callback error:', err);
      return next(err); 
    }
    if (!user) { 
      console.warn('Auth0 authentication failed:', info?.message || 'No user returned');
      req.flash('error_msg', info?.message || 'Authentication failed. Please try again.');
      return res.redirect('/'); // Redirect to landing on failure
    }
    // Manually establish the session
    req.logIn(user, (loginErr) => {
      if (loginErr) { 
        console.error('Session login error after Auth0 callback:', loginErr);
        return next(loginErr); 
      }
      console.log('Auth0 authentication successful, redirecting to dashboard');
      res.redirect('/dashboard');
    });
  })(req, res, next);
};

// @desc    Logout user
// @route   GET /auth/logout
exports.logout = (req, res, next) => {
  if (enableTestMode) {
    console.log('Test mode: Logout bypassed, redirecting to landing');
    // Simulate logout if needed for test user state
    if (req.user) req.user = null; 
    return res.redirect('/');
  }
  
  // Standard logout
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return next(err);
    }
    // Optional: Clear session cookie or perform Auth0 logout redirect
    console.log('User logged out, redirecting to landing');
    res.redirect('/');
  });
};

// @desc    Update user role (e.g., after initial signup)
// @route   PUT /auth/role 
exports.updateRole = async (req, res, next) => {
  // Ensure user is authenticated (using middleware is better, but checking here)
  if (!enableTestMode && !req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  const { role } = req.body;
  if (!['volunteer', 'organization'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role specified' });
  }

  try {
    if (enableTestMode) {
      // Update test user role in session
      if (req.user) req.user.role = role;
      console.log(`Test mode: User role updated to ${role}`);
    } else {
      // Update user role in the database
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id, 
        { role: role }, 
        { new: true } // Return the updated document
      );
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      console.log(`User ${req.user._id} role updated to ${role}`);
    }

    // Respond with success or redirect
    // Redirecting might be better if called from a form
    res.redirect('/dashboard'); 
    // Or send JSON response if it's an API-like call
    // res.status(200).json({ success: true, message: `Role updated to ${role}` });

  } catch (err) {
    console.error('Error updating user role:', err);
    // Ensure JSON response for API-like route
    if (!res.headersSent) { 
      res.status(500).json({ success: false, message: 'Server error while updating role' });
    }
    next(err); // Pass to central error handler
  }
}; 