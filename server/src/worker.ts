// Notification worker — Phase 6. Runs as its own process (npm run worker).
// Blocks on the Redis queue with BRPOP and "delivers" each task-assignment job.
// There's no real push service in this learning project, so delivery is a log
// line — the point is the producer/consumer mechanics: the API enqueues and
// returns immediately, and this worker drains the queue independently.

import { config } from './config/env.js'; // load .env before anything reads it
import { Redis } from 'ioredis';
import { NOTIFICATIONS_QUEUE, type TaskAssignedJob } from './lib/queue.js';

// A blocking command (BRPOP) ties up its connection, so the worker uses its own.
// maxRetriesPerRequest:null lets the blocking call wait without being aborted.
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

connection.on('error', (err) => console.error('[worker] redis error:', err.message));

function handleJob(job: TaskAssignedJob): void {
  if (job.type === 'task_assigned') {
    console.log(
      `[worker] notify → user ${job.assigneeId}: assigned task ${job.taskId} ` +
        `("${job.title}") in project ${job.projectId} by user ${job.assignedBy} at ${job.at}`,
    );
  } else {
    console.log('[worker] unknown job:', job);
  }
}

let running = true;

async function loop(): Promise<void> {
  console.log(`[worker] waiting for jobs on "${NOTIFICATIONS_QUEUE}" …`);
  while (running) {
    try {
      // BRPOP blocks up to 5s, then returns null so the loop can re-check `running`.
      const result = await connection.brpop(NOTIFICATIONS_QUEUE, 5);
      if (!result) continue;
      const job = JSON.parse(result[1]) as TaskAssignedJob;
      handleJob(job);
    } catch (err) {
      console.error('[worker] loop error:', err instanceof Error ? err.message : err);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

function shutdown(): void {
  console.log('[worker] shutting down …');
  running = false;
  connection.quit().finally(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

loop();
