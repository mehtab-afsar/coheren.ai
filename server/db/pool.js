import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Test connection on startup
pool.query('SELECT NOW()')
  .then(res => console.log('✅ PostgreSQL connected at', res.rows[0].now))
  .catch(err => console.error('❌ PostgreSQL connection error:', err.message));

export default pool;
