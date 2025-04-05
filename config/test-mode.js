/**
 * Test mode configuration
 * This file allows testing the application without setting up Auth0
 */

// Mock user for testing
const testUser = {
  id: '123456789',
  auth0Id: 'test-user',
  email: 'test@example.com',
  name: 'Test User',
  role: 'volunteer', // Change to 'organization' to test organization features
  points: 100,
  createdAt: new Date(),
  attendedEvents: []
};

// Mock authentication middleware for testing
const mockAuth = (req, res, next) => {
  // Set authentication method
  req.isAuthenticated = () => true;
  
  // Set user in the request
  req.user = testUser;
  
  // Set user logout function
  req.logout = (callback) => {
    req.user = null;
    req.isAuthenticated = () => false;
    if (callback) callback();
  };
  
  next();
};

// Mock Auth0 configuration function
const mockConfigureAuth0 = () => {
  console.log('Test mode: Auth0 configuration bypassed');
};

// Toggle test mode
const enableTestMode = true;

module.exports = {
  testUser,
  mockAuth,
  mockConfigureAuth0,
  enableTestMode
}; 