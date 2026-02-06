require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const formsRoutes = require('./routes/forms');
const leadsRoutes = require('./routes/leads');
const evolutionRoutes = require('./routes/evolution');
const dashboardRoutes = require('./routes/dashboard');
const publicRoutes = require('./routes/public');
const settingsRoutes = require('./routes/settings');
const uploadsRoutes = require('./routes/uploads');
const linksRoutes = require('./routes/links');
const diagnosticsRoutes = require('./routes/diagnostics');

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
// Prefer DATABASE_URL when provided (common in managed Postgres providers)
const DB_SSL = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const dbPublicConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'formbuilder',
  database: process.env.DB_NAME || 'formbuilder',
  ssl: DB_SSL,
  using_database_url: Boolean(process.env.DATABASE_URL),
};

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: DB_SSL ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: dbPublicConfig.host,
      port: dbPublicConfig.port,
      user: dbPublicConfig.user,
      password: process.env.DB_PASSWORD || 'changeme123',
      database: dbPublicConfig.database,
      ssl: DB_SSL ? { rejectUnauthorized: false } : undefined,
    });

pool.on('error', (err) => {
  console.error('[db] Unexpected idle client error:', {
    message: err?.message,
    code: err?.code,
  });
});

// Make pool available to routes
app.locals.pool = pool;

// Auto-migration (Temporary Fix for existing deployments)
// This attempts to add missing columns to existing tables
const runMigrations = async () => {
  try {
    // Add internal_api_url to evolution_instances if missing
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'evolution_instances' AND column_name = 'internal_api_url'
        ) THEN
          ALTER TABLE evolution_instances ADD COLUMN internal_api_url VARCHAR(500);
          RAISE NOTICE 'Added internal_api_url column to evolution_instances';
        END IF;
      END $$;
    `);
    console.log('[startup] Migrations checked');
  } catch (err) {
    console.error('[startup] Migration error:', err.message);
  }
};
runMigrations();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Build version - update this when deploying
const BUILD_VERSION = '2.1.0';
const BUILD_DATE = '2025-02-05T12:00:00Z';

// Health check
app.get('/health', async (req, res) => {
  // Optional deep check: /health?db=1
  const checkDb = req.query.db === '1';
  if (!checkDb) {
    return res.json({ 
      status: 'ok', 
      version: BUILD_VERSION,
      build_date: BUILD_DATE,
      timestamp: new Date().toISOString() 
    });
  }

  try {
    await pool.query('SELECT 1');
    return res.json({ 
      status: 'ok', 
      db: 'ok', 
      version: BUILD_VERSION,
      build_date: BUILD_DATE,
      timestamp: new Date().toISOString() 
    });
  } catch (err) {
    console.error('[health] DB check failed:', {
      message: err?.message,
      code: err?.code,
    });
    return res.status(500).json({
      status: 'error',
      db: 'error',
      version: BUILD_VERSION,
      build_date: BUILD_DATE,
      error: {
        code: err?.code,
        message: err?.message,
      },
      db_config: dbPublicConfig,
      timestamp: new Date().toISOString(),
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/evolution-instances', evolutionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);
app.use('/l', linksRoutes); // Public redirect route

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
