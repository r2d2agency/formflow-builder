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

const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.warn(
    `[startup] Missing env vars: ${missingEnv.join(', ')}. ` +
      'If you are deploying on Easypanel, set these variables in the backend service.'
  );
}

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'formbuilder',
  password: process.env.DB_PASSWORD || 'changeme123',
  database: process.env.DB_NAME || 'formbuilder',
});

pool.on('error', (err) => {
  console.error('[db] Unexpected idle client error:', {
    message: err?.message,
    code: err?.code,
  });
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
app.get('/health', async (req, res) => {
  // Optional deep check: /health?db=1
  const checkDb = req.query.db === '1';
  if (!checkDb) {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[health] DB check failed:', {
      message: err?.message,
      code: err?.code,
    });
    return res.status(500).json({ status: 'error', db: 'error', timestamp: new Date().toISOString() });
  }
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
  // Startup DB check (logs only; does not crash the container)
  pool
    .query('SELECT 1')
    .then(() => console.log('[startup] DB connection: OK'))
    .catch((err) =>
      console.error('[startup] DB connection: FAILED', {
        message: err?.message,
        code: err?.code,
      })
    );
});
