// Small input-validation helpers shared by the CRUD routes.

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

// Parse a positive integer id from a route param or body value.
// Returns null when it isn't a valid id (so callers can answer 400).
export function parseId(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Accept an ISO date string (YYYY-MM-DD) or null/undefined for an optional due date.
export function parseDueDate(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: true, value };
  return { ok: false };
}
