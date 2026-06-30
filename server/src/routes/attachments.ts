// Attachment serving — Phase 5. Mounted at /api/attachments behind requireAuth.
//   GET /api/attachments/:filename   download a file (members of its project only)
//
// The upload endpoint lives on the tasks router (POST /api/tasks/:id/attachments)
// because it is task-scoped; serving is filename-scoped, so it lives here.

import { Router } from 'express';
import path from 'node:path';
import { pool } from '../config/db.js';
import { errMessage } from '../lib/errors.js';
import { isProjectMember } from '../lib/access.js';
import { UPLOADS_DIR } from '../config/uploads.js';

const router = Router();

// Stored names are UUID + extension. Reject anything else so a crafted param
// can't escape the uploads directory.
const SAFE_FILENAME = /^[A-Za-z0-9._-]+$/;

// GET /api/attachments/:filename
router.get('/:filename', async (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!SAFE_FILENAME.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT a.original_name, a.mime_type, t.project_id
         FROM attachments a
         JOIN tasks t ON t.id = a.task_id
        WHERE a.filename = $1`,
      [filename],
    );
    const att = rows[0];
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    if (!(await isProjectMember(req.user!.id, Number(att.project_id)))) {
      return res.status(403).json({ error: "You are not a member of this attachment's project" });
    }

    res.type(att.mime_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${att.original_name.replace(/"/g, '')}"`,
    );
    return res.sendFile(path.join(UPLOADS_DIR, filename), (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ error: 'File is missing on disk' });
      }
    });
  } catch (err) {
    console.error('[attachments] serve failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to serve attachment' });
  }
});

export default router;
