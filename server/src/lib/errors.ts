// Small error helpers shared by route handlers.

// In strict mode a caught error is typed `unknown`; narrow before reading .message.
export function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Postgres raises SQLSTATE 23505 on a unique-constraint violation
// (e.g. registering an email that already exists).
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}
