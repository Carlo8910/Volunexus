const passport = require('passport');
const Auth0Strategy = require('passport-auth0');
const User = require('../models/User');

// Configure Auth0 Strategy
const configureAuth0 = () => {
  passport.use(
    new Auth0Strategy(
      {
        domain: process.env.AUTH0_DOMAIN,
        clientID: process.env.AUTH0_CLIENT_ID,
        clientSecret: process.env.AUTH0_CLIENT_SECRET,
        callbackURL: process.env.AUTH0_CALLBACK_URL
      },
      async (accessToken, refreshToken, extraParams, profile, done) => {
        try {
          // Check if user exists
          let user = await User.findOne({ auth0Id: profile.id });

          // If not, create user
          if (!user) {
            user = await User.create({
              auth0Id: profile.id,
              email: profile.emails[0].value,
              name: profile.displayName || profile.name.givenName + ' ' + profile.name.familyName
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
};

module.exports = configureAuth0; 