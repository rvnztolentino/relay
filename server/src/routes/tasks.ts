// Task routes — Phase 4. All routes require auth (mounted with requireAuth).
//   GET    /api/tasks/:id            task detail (members only)
//   PUT    /api/tasks/:id            update fields (members only)
//   DELETE /api/tasks/:id            delete (task creator or project owner)
//   GET    /api/tasks/:id/comments   list comments (members only)
//   POST   /api/tasks/:id/comments   add a comment (members only)

import { Router } from 'express';
import { pool } from '../config/db.js';
import { errMessage } from '../lib/errors.js';
import { getTaskAccess, isProjectMember } from '../lib/access.js';
import { parseId, isTaskStatus, parseDueDate } from '../lib/validate.js';

const router = Router();

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  const taskId = parseId(req.params.id);
  if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

  try {
    const access = await getTaskAccess(req.user!.id, taskId);
    if (!access) return res.status(404).json({ error: 'Task not found' });
    if (!access.isMember) {
      return res.status(403).json({ error: 'You are not a member of this task\'s project' });
    }
    const { rows } = await pool.query(
      `SELECT t.id, t.project_id, t.title, t.description, t.status, t.due_date,
              t.assignee_id, ua.name AS assignee_name,
              t.created_by, uc.name AS created_by_name, t.created_at
         FROM tasks t
         JOIN users uc ON uc.id = t.created_by
         LEFT JOIN users ua ON ua.id = t.assignee_id
        WHERE t.id = $1`,
      [taskId],
    );
    return res.json({ task: rows[0] });
  } catch (err) {
    console.error('[tasks] detail failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to load task' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  const taskId = parseId(req.params.id);
  if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

  const { title, description, status, assignee_id, due_date } = req.body ?? {};
  if (
    title === undefined &&
    description === undefined &&
    status === undefined &&
    assignee_id === undefined &&
    due_date === undefined
  ) {
    return res.status(400).json({ error: 'Provide at least one field to update' });
  }
  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return res.status(400).json({ error: 'title must be a non-empty string' });
  }
  if (status !== undefined && !isTaskStatus(status)) {
    return res.status(400).json({ error: 'status must be one of todo, in_progress, done' });
  }
  let due: { ok: true; value: string | null } | { ok: false } | undefined;
  if (due_date !== undefined) {
    due = parseDueDate(due_date);
    if (!due.ok) return res.status(400).json({ error: 'due_date must be YYYY-MM-DD or null' });
  }
  let assigneeProvided = false;
  let assigneeId: number | null = null;
  if (assignee_id !== undefined) {
    assigneeProvided = true;
    if (assignee_id !== null) {
      const parsed = parseId(assignee_id);
      if (!parsed) return res.status(400).json({ error: 'Invalid assignee_id' });
      assigneeId = parsed;
    }
  }

  try {
    const access = await getTaskAccess(req.user!.id, taskId);
    if (!access) return res.status(404).json({ error: 'Task not found' });
    if (!access.isMember) {
      return res.status(403).json({ error: 'You are not a member of this task\'s project' });
    }
    if (assigneeProvided && assigneeId !== null && !(await isProjectMember(assigneeId, access.projectId))) {
      return res.status(400).json({ error: 'Assignee must be a member of the project' });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (title !== undefined) {
      fields.push(`title = $${i++}`);
      values.push(title.trim());
    }
    if (description !== undefined) {
      fields.push(`description = $${i++}`);
      values.push(typeof description === 'string' && description.trim() ? description.trim() : null);
    }
    if (status !== undefined) {
      fields.push(`status = $${i++}::task_status`);
      values.push(status);
    }
    if (assigneeProvided) {
      fields.push(`assignee_id = $${i++}`);
      values.push(assigneeId);
    }
    if (due !== undefined && due.ok) {
      fields.push(`due_date = $${i++}`);
      values.push(due.value);
    }
    values.push(taskId);

    const { rows } = await pool.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, project_id, assignee_id, created_by, title, description, status, due_date, created_at`,
      values,
    );
    return res.json({ task: rows[0] });
  } catch (err) {
    console.error('[tasks] update failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id  (task creator or project owner)
router.delete('/:id', async (req, res) => {
  const taskId = parseId(req.params.id);
  if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

  try {
    const access = await getTaskAccess(req.user!.id, taskId);
    if (!access) return res.status(404).json({ error: 'Task not found' });
    const canDelete = access.createdBy === req.user!.id || access.ownerId === req.user!.id;
    if (!canDelete) {
      return res.status(403).json({ error: 'Only the task creator or project owner can delete it' });
    }
    await pool.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
    return res.status(204).send();
  } catch (err) {
    console.error('[tasks] delete failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

// GET /api/tasks/:id/comments
router.get('/:id/comments', async (req, res) => {
  const taskId = parseId(req.params.id);
  if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

  try {
    const access = await getTaskAccess(req.user!.id, taskId);
    if (!access) return res.status(404).json({ error: 'Task not found' });
    if (!access.isMember) {
      return res.status(403).json({ error: 'You are not a member of this task\'s project' });
    }
    const { rows } = await pool.query(
      `SELECT c.id, c.task_id, c.user_id, u.name AS user_name, c.body, c.created_at
         FROM comments c
         JOIN users u ON u.id = c.user_id
        WHERE c.task_id = $1
        ORDER BY c.created_at ASC`,
      [taskId],
    );
    return res.json({ comments: rows });
  } catch (err) {
    console.error('[tasks] list comments failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to list comments' });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', async (req, res) => {
  const taskId = parseId(req.params.id);
  if (!taskId) return res.status(400).json({ error: 'Invalid task id' });

  const { body } = req.body ?? {};
  if (typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ error: 'Comment body is required' });
  }

  try {
    const access = await getTaskAccess(req.user!.id, taskId);
    if (!access) return res.status(404).json({ error: 'Task not found' });
    if (!access.isMember) {
      return res.status(403).json({ error: 'You are not a member of this task\'s project' });
    }
    const { rows } = await pool.query(
      `INSERT INTO comments (task_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, task_id, user_id, body, created_at`,
      [taskId, req.user!.id, body.trim()],
    );
    return res.status(201).json({ comment: rows[0] });
  } catch (err) {
    console.error('[tasks] add comment failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to add comment' });
  }
});

export default router;
