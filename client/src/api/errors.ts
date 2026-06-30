// Pull a human-readable message out of an API error. The backend always returns
// { error: "..." }, so surface that; otherwise fall back to the generic message.

import axios from 'axios';

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
