require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

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
const logsRoutes = require('./routes/logs');
const remarketingRoutes = require('./routes/remarketing');
const { startScheduler } = require('./scheduler/remarketing');

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
    // 1. Initialize Schema if tables are missing
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        console.log('[startup] Users table not found. Initializing database schema...');
        const initSqlPath = path.join(__dirname, '../init.sql');
        
        if (fs.existsSync(initSqlPath)) {
          const sql = fs.readFileSync(initSqlPath, 'utf8');
          await pool.query(sql);
          console.log('[startup] Schema initialized successfully from init.sql');
        } else {
          console.warn('[startup] init.sql not found at:', initSqlPath);
        }
      }
    } catch (e) {
      console.error('[startup] Failed to initialize schema:', e.message);
    }

    // 2. Update forms type check constraint
    try {
      await pool.query(`
        ALTER TABLE forms DROP CONSTRAINT IF EXISTS forms_type_check;
        ALTER TABLE forms ADD CONSTRAINT forms_type_check CHECK (type IN ('typeform', 'chat', 'standard', 'link_bio'));
      `);
      console.log('[startup] Forms type constraint updated.');
    } catch (e) {
      // Ignore error if constraint doesn't exist or other issues, but log it
      console.warn('[startup] Note on constraint update:', e.message);
    }

    // 3. Add internal_api_url to evolution_instances if missing (Legacy Migration)
    try {
      await pool.query('ALTER TABLE evolution_instances ADD COLUMN IF NOT EXISTS internal_api_url VARCHAR(500)');
      console.log('[startup] Checked/Added internal_api_url column');
    } catch (e) {
      console.warn('[startup] Failed to add internal_api_url column:', e.message);
    }
    // 3. Create integration_logs table if missing
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS integration_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
          lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
          integration_type VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL,
          payload JSONB,
          response JSONB,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log('[startup] Checked/Created integration_logs table');
    } catch (e) {
      console.warn('[startup] Failed to create integration_logs table:', e.message);
    }

    // 4. Add user_id to evolution_instances if missing
    try {
      await pool.query('ALTER TABLE evolution_instances ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE');
      console.log('[startup] Checked/Added user_id column to evolution_instances');
    } catch (e) {
      console.warn('[startup] Failed to add user_id column to evolution_instances:', e.message);
    }

    // 5. Create Remarketing Tables
    try {
      // remarketing_campaigns
      await pool.query(`
        CREATE TABLE IF NOT EXISTS remarketing_campaigns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('recovery', 'drip')),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // remarketing_steps
      await pool.query(`
        CREATE TABLE IF NOT EXISTS remarketing_steps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_id UUID REFERENCES remarketing_campaigns(id) ON DELETE CASCADE,
          step_order INTEGER NOT NULL,
          delay_value INTEGER NOT NULL,
          delay_unit VARCHAR(10) NOT NULL CHECK (delay_unit IN ('minutes', 'hours', 'days')),
          message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'audio', 'video', 'document', 'image')),
          message_content TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // remarketing_logs
      await pool.query(`
        CREATE TABLE IF NOT EXISTS remarketing_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
          campaign_id UUID REFERENCES remarketing_campaigns(id) ON DELETE CASCADE,
          step_id UUID REFERENCES remarketing_steps(id) ON DELETE CASCADE,
          sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          status VARCHAR(20) NOT NULL,
          error_message TEXT
        );
      `);
      console.log('[startup] Checked/Created remarketing tables');
    } catch (e) {
      console.warn('[startup] Failed to create remarketing tables:', e.message);
    }

    console.log('[startup] Migrations checked');

    // Seed default admin user if no users exist
    try {
      const userCount = await pool.query('SELECT count(*) FROM users');
      if (parseInt(userCount.rows[0].count) === 0) {
        console.log('[startup] No users found. Creating default admin...');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('123456', salt);
        
        await pool.query(
          `INSERT INTO users (email, password_hash, name, role)
           VALUES ($1, $2, $3, $4)`,
          ['admin@admin.com', hash, 'Admin', 'admin']
        );
        console.log('[startup] Default admin created: admin@admin.com / 123456');
      }
    } catch (e) {
      console.warn('[startup] Failed to seed admin user:', e.message);
    }

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
const BUILD_VERSION = '2.1.3';
const BUILD_DATE = '2025-02-06T12:00:00Z';

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
app.use('/api/logs', logsRoutes);
app.use('/api/remarketing', remarketingRoutes);
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
    .then(() => {
      console.log('[startup] DB connection: OK');
      startScheduler(pool);
    })
    .catch((err) =>
      console.error('[startup] DB connection: FAILED', {
        message: err?.message,
        code: err?.code,
      })
    );
});
