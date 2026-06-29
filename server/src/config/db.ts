// PostgreSQL connection pool (node-postgres / pg).
// A short connection timeout makes /health fail fast when the DB is down.

import pg from 'pg';
import { config } from './env.js';

export const pool = new pg.Pool({
  host: config.pg.host,
  port: config.pg.port,
  user: config.pg.user,
  password: config.pg.password,
  database: config.pg.database,
  connectionTimeoutMillis: 3000,
});

// Don't let an idle-client error crash the process.
pool.on('error', (err) => {
  console.error('[pg] idle client error:', err.message);
});
