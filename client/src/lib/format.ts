// Small display helpers.

// Dates: due_date is already a plain 'YYYY-MM-DD' string (show as-is);
// timestamps (created_at) are ISO and get localized.
export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export function fmtBytes(value: string | number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};
export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
