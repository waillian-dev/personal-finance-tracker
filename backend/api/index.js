const connectDB = require('../config/db');
const app = require('../app');

// Ensure MongoDB database connection is established
connectDB();

// Export express app handler for Vercel Serverless Function
module.exports = app;
