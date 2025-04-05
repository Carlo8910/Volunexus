const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  auth0Id: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['volunteer', 'organization'],
    default: 'volunteer'
  },
  points: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  attendedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity'
  }]
});

module.exports = mongoose.model('User', UserSchema); 