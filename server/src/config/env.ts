// Loads the single repo-root .env and exposes a typed config object.
//
// Why this file is imported FIRST in index.ts: ES module imports are hoisted and
// evaluated before any other top-level code, so if db.ts/redis.ts read process.env
// at import time, dotenv must already have run. Importing this module first
// guarantees the .env is loaded before any consumer reads `config`.

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// server/src/config/env.ts -> repo root is three levels up.
dotenv.config({ path: join(here, '../../../.env') });

export const config = {
  port: Number(process.env.PORT ?? 3000),
  pg: {
    host: process.env.PGHOST ?? 'localhost',
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.POSTGRES_USER ?? 'relay',
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB ?? 'relay',
  },
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwt: {
    // Read from .env; token.ts fails loudly at sign/verify time if it's empty.
    secret: process.env.JWT_SECRET ?? '',
    expiresInSeconds: 60 * 60 * 24 * 7, // 7 days
  },
};
