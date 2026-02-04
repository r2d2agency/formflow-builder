require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const authRoutes = require('./routes/auth');
const formsRoutes = require('./routes/forms');
const leadsRoutes = require('./routes/leads');
const evolutionRoutes = require('./routes/evolution');
const dashboardRoutes = require('./routes/dashboard');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'formbuilder',
  password: process.env.DB_PASSWORD || 'changeme123',
  database: process.env.DB_NAME || 'formbuilder',
});

// Make pool available to routes
app.locals.pool = pool;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/evolution-instances', evolutionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FormBuilder API running on port ${PORT}`);
});
