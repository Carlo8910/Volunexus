const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Check if MongoDB URI is provided
    if (!process.env.MONGODB_URI) {
      console.log('⚠️ Warning: MONGODB_URI not found in environment variables.');
      console.log('Some features may not work correctly without a database connection.');
      console.log('Please set up your MongoDB connection in config/.env');
      return; // Skip the connection attempt
    }
    
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.log('The application will continue running but database features will not work.');
    console.log('Please check your MongoDB connection string in config/.env');
  }
};

module.exports = connectDB; 