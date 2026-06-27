// GET /health — a real environment check: pings Postgres and Redis.
// Returns 200 only when both are reachable, otherwise 503.

import { Router } from 'express';
import { pool } from '../config/db.js';
import { redis } from '../config/redis.js';

const router = Router();

router.get('/', async (req, res) => {
  const checks = { db: 'down', redis: 'down' };

  try {
    await pool.query('SELECT 1');
    checks.db = 'up';
  } catch (err) {
    console.error('[health] db check failed:', err.message);
  }

  try {
    if ((await redis.ping()) === 'PONG') checks.redis = 'up';
  } catch (err) {
    console.error('[health] redis check failed:', err.message);
  }

  const ok = checks.db === 'up' && checks.redis === 'up';
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    db: checks.db,
    redis: checks.redis,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
