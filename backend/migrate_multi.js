const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'formbuilder',
  password: process.env.DB_PASSWORD || 'changeme123',
  database: process.env.DB_NAME || 'formbuilder',
});

async function migrate() {
  try {
    console.log('Connecting...');
    const client = await pool.connect();
    console.log('Connected.');
    
    console.log('Dropping constraint...');
    try {
        await client.query('ALTER TABLE remarketing_steps DROP CONSTRAINT remarketing_steps_message_type_check');
        console.log('Dropped.');
    } catch (e) {
        console.log('Drop failed (maybe not exists):', e.message);
    }
    
    console.log('Adding new constraint...');
    await client.query(`
      ALTER TABLE remarketing_steps 
      ADD CONSTRAINT remarketing_steps_message_type_check 
      CHECK (message_type IN ('text', 'audio', 'video', 'document', 'image', 'multi'))
    `);
    
    console.log('Done.');
    client.release();
    pool.end();
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

migrate();
