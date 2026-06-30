// Login rate limiter — Phase 6.
// Fixed-window counter in Redis: at most 5 attempts per IP per 15 minutes.
// INCR creates the key on the first attempt; we set the TTL once, then every
// request reads the running count. If Redis is unavailable the limiter fails
// OPEN (allows the request) so a cache outage can't lock everyone out.

import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis.js';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

export async function loginRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ip = req.ip ?? 'unknown';
  const key = `ratelimit:login:${ip}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    if (count > MAX_ATTEMPTS) {
      const ttl = await redis.ttl(key);
      res.setHeader('Retry-After', String(ttl > 0 ? ttl : WINDOW_SECONDS));
      res.status(429).json({ error: 'Too many login attempts. Try again later.' });
      return;
    }
    next();
  } catch (err) {
    console.warn(
      '[ratelimit] Redis unavailable, allowing request:',
      err instanceof Error ? err.message : err,
    );
    next();
  }
}
