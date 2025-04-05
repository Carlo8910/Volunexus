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

// Load environment variables
dotenv.config({ path: './config/.env' });

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

// Set up view engine
app.engine('.hbs', engine({ defaultLayout: 'main', extname: '.hbs' }));
app.set('view engine', '.hbs');
app.set('views', './views');

// Static folder
app.use(express.static(path.join(__dirname, 'public')));

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

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Configure Auth0
configureAuth0();

// Set global variables for views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const opportunityRoutes = require('./routes/opportunities');
const userRoutes = require('./routes/users');

// Use routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/opportunities', opportunityRoutes);
app.use('/users', userRoutes);

// Port configuration
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 