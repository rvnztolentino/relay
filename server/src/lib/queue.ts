// Notification queue producer — Phase 6.
// When a task is assigned, we push a job onto a Redis list and return immediately;
// a separate worker process (src/worker.ts) consumes it. Enqueuing is best-effort:
// a Redis outage must not fail task creation, so failures are logged and swallowed.

import { redis } from '../config/redis.js';

export const NOTIFICATIONS_QUEUE = 'queue:notifications';

export interface TaskAssignedJob {
  type: 'task_assigned';
  taskId: number;
  title: string;
  projectId: number;
  assigneeId: number;
  assignedBy: number;
  at: string; // ISO timestamp
}

export async function enqueueTaskAssigned(
  job: Omit<TaskAssignedJob, 'type' | 'at'>,
): Promise<void> {
  const payload: TaskAssignedJob = {
    type: 'task_assigned',
    at: new Date().toISOString(),
    ...job,
  };
  try {
    await redis.lpush(NOTIFICATIONS_QUEUE, JSON.stringify(payload));
  } catch (err) {
    console.warn(
      '[queue] could not enqueue notification:',
      err instanceof Error ? err.message : err,
    );
  }
}
