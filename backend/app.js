const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Body Parser Middleware
app.use(express.json());

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Route Files
const authRoutes = require('./routes/authRoutes');
const walletRoutes = require('./routes/walletRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const predictionsRoutes = require('./routes/predictionsRoutes');
const recurringRoutes = require('./routes/recurringRoutes');
const friendRoutes = require('./routes/friendRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const savingGoalRoutes = require('./routes/savingGoalRoutes');
const connectDB = require('./config/db');

// Health check endpoint (Public - No DB dependency)
app.get('/api/status', (req, res) => {
  res.json({ success: true, message: 'Personal Finance Tracker API is running' });
});

// Serverless DB Connection Middleware for database routes
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error in request:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Database Connection Failed. Please check MONGO_URI.' });
  }
});

// Mount Routers
app.use('/api/auth', authRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/saving-goals', savingGoalRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error(err.stack);
  }
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Server Error',
  });
});

module.exports = app;
