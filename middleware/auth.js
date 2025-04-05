// Authentication middleware
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

// Role-based access control
const ensureOrganization = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'organization') {
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
  res.redirect('/dashboard');
};

module.exports = {
  ensureAuth,
  ensureGuest,
  ensureOrganization
}; 