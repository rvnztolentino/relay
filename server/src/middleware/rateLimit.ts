// Login rate limiter — Phase 6.
// Brute-force guard on POST /api/auth/login: at most 5 FAILED attempts per IP
// per 15 minutes. Only failures count (recorded by registerLoginFailure from the
// login handler), and a successful login clears the counter — so logging in
// correctly never locks you out. If Redis is unavailable the limiter fails OPEN
// (allows the request) so a cache outage can't block everyone.

import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis.js';

const MAX_FAILURES = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

const keyFor = (req: Request) => `ratelimit:login:${req.ip ?? 'unknown'}`;

// Middleware: block only once the IP already has MAX_FAILURES failures in the window.
// It does not increment — counting happens on failed logins via registerLoginFailure.
export async function loginRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const key = keyFor(req);
  try {
    const count = Number(await redis.get(key)) || 0;
    if (count >= MAX_FAILURES) {
      const ttl = await redis.ttl(key);
      res.setHeader('Retry-After', String(ttl > 0 ? ttl : WINDOW_SECONDS));
      res.status(429).json({ error: 'Too many failed login attempts. Try again later.' });
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

// Call after a wrong email/password: increment this IP's failure counter.
export async function registerLoginFailure(req: Request): Promise<void> {
  const key = keyFor(req);
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);
  } catch {
    // best-effort; a missed increment just means one fewer counted failure.
  }
}

// Call after a successful login: clear this IP's failure counter.
export async function clearLoginAttempts(req: Request): Promise<void> {
  try {
    await redis.del(keyFor(req));
  } catch {
    // best-effort
  }
}
