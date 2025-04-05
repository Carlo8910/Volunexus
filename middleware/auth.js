// Get test mode configuration
const { enableTestMode } = require('../config/test-mode');

// Authentication middleware
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  if (enableTestMode) {
    // In test mode, we'll just continue even if not authenticated
    console.log('Test mode: Authentication check bypassed');
    return next();
  }
  
  res.redirect('/login');
};

// Role-based access control
const ensureOrganization = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'organization') {
    return next();
  }
  
  if (enableTestMode) {
    // In test mode, we'll just continue even if not an organization
    console.log('Test mode: Organization role check bypassed');
    return next();
  }
  
  res.status(403).render('error/403', {
    layout: 'error',
    message: 'You must be an organization to access this resource'
  });
};

const ensureGuest = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  
  if (enableTestMode) {
    // In test mode, allow access to guest-only routes even if authenticated
    console.log('Test mode: Guest check bypassed');
    return next();
  }
  
  res.redirect('/dashboard');
};

module.exports = {
  ensureAuth,
  ensureGuest,
  ensureOrganization
}; 