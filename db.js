const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool with SSL support for Supabase
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000, // 5 seconds to wait for connection
  query_timeout: 10000 // 10 seconds for query
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Database Connected Successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = pool;
