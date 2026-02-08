const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'formbuilder',
  password: process.env.DB_PASSWORD || 'changeme123',
  database: process.env.DB_NAME || 'formbuilder',
});

async function migrate() {
  try {
    console.log('Connecting to database...');
    
    // 1. Drop old constraint
    try {
      await pool.query('ALTER TABLE remarketing_steps DROP CONSTRAINT IF EXISTS remarketing_steps_message_type_check');
      console.log('Dropped old constraint (if existed)');
    } catch (e) {
      console.log('Error dropping constraint (might not exist):', e.message);
    }

    // 2. Add new constraint with 'multi'
    await pool.query(`
      ALTER TABLE remarketing_steps 
      ADD CONSTRAINT remarketing_steps_message_type_check 
      CHECK (message_type IN ('text', 'audio', 'video', 'document', 'image', 'multi'))
    `);
    console.log('Added new constraint with multi-message support');

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
