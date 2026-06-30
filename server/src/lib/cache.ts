// Project-list cache — Phase 6.
// Each user's project list is cached under cache:projects:user:<id> for 60s and
// busted on any write that changes what that list contains. Every call is wrapped
// so a Redis outage degrades to a plain DB read instead of failing the request.

import { redis } from '../config/redis.js';

const TTL_SECONDS = 60;
const keyFor = (userId: number) => `cache:projects:user:${userId}`;

export async function getCachedProjectList(userId: number): Promise<unknown[] | null> {
  try {
    const raw = await redis.get(keyFor(userId));
    return raw ? (JSON.parse(raw) as unknown[]) : null;
  } catch {
    return null; // Redis down or unreachable → caller falls back to the DB.
  }
}

export async function setCachedProjectList(userId: number, projects: unknown[]): Promise<void> {
  try {
    await redis.set(keyFor(userId), JSON.stringify(projects), 'EX', TTL_SECONDS);
  } catch {
    // best-effort; a missed cache write just means the next read hits the DB.
  }
}

// Drop the cached list for one or more users (e.g. everyone in a changed project).
export async function bustProjectListCache(userIds: number[]): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await redis.del(...userIds.map(keyFor));
  } catch {
    // ignore; the entry will expire within the TTL anyway.
  }
}
