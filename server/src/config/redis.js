// Redis client (ioredis).
// enableOfflineQueue:false + a single retry per request make /health fail fast
// when Redis is down, instead of queueing the PING until a connection exists.

import Redis from 'ioredis';
import { config } from './env.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  connectTimeout: 3000,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

// ioredis emits 'error' on every failed reconnect; log quietly so it isn't fatal.
redis.on('error', (err) => {
  console.error('[redis] error:', err.message);
});
