const connectDB = require('../backend/config/db');
const app = require('../backend/app');

// Ensure MongoDB database connection is established
connectDB();

// Export express app handler for Vercel Serverless Function
module.exports = app;
