// Multer upload config — Phase 5.
// The API runs on the host (only Postgres/Redis are containerized), so uploaded
// files persist in a local `server/uploads/` folder rather than a Docker volume.
// That folder is gitignored. Files are stored under a generated UUID name (never
// the user-supplied name) to avoid collisions and path-traversal; the original
// name is kept in the `attachments` table for display and download.

import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve to server/uploads from this file. Works the same whether running from
// src/config (tsx dev) or dist/config (built): both are two levels under server/.
const here = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(here, '../../uploads');

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

// Single-file uploads under the form field "file". Size-capped; on overflow
// multer raises a MulterError handled by the error middleware in index.ts.
export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});
