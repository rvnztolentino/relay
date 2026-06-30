// Project routes — Phase 4. All routes require auth (mounted with requireAuth).
//   POST   /api/projects                 create (creator becomes owner + member)
//   GET    /api/projects                 list projects the user belongs to
//   GET    /api/projects/:id             project detail + member list (members only)
//   PUT    /api/projects/:id             update name/description (owner only)
//   DELETE /api/projects/:id             delete project + cascade (owner only)
//   POST   /api/projects/:id/members     add a member by email (owner only)
//   GET    /api/projects/:id/tasks       list tasks in the project (members only)
//   POST   /api/projects/:id/tasks       create a task (members only)

import { Router } from 'express';
import { pool } from '../config/db.js';
import { errMessage, isUniqueViolation } from '../lib/errors.js';
import { isProjectMember } from '../lib/access.js';
import { parseId, isTaskStatus, parseDueDate } from '../lib/validate.js';
import {
  getCachedProjectList,
  setCachedProjectList,
  bustProjectListCache,
} from '../lib/cache.js';
import { enqueueTaskAssigned } from '../lib/queue.js';

// Member ids of a project — used to bust every affected user's list cache.
async function projectMemberIds(projectId: number): Promise<number[]> {
  const { rows } = await pool.query(
    `SELECT user_id FROM project_members WHERE project_id = $1`,
    [projectId],
  );
  return rows.map((r) => Number(r.user_id));
}

const router = Router();

// POST /api/projects
router.post('/', async (req, res) => {
  const { name, description } = req.body ?? {};
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  const desc = typeof description === 'string' && description.trim() ? description.trim() : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, owner_id, created_at`,
      [name.trim(), desc, req.user!.id],
    );
    const project = rows[0];
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [project.id, req.user!.id],
    );
    await client.query('COMMIT');
    await bustProjectListCache([req.user!.id]); // creator's list changed
    return res.status(201).json({ project });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[projects] create failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to create project' });
  } finally {
    client.release();
  }
});

// GET /api/projects  (cached per user, 60s TTL)
router.get('/', async (req, res) => {
  const userId = req.user!.id;
  const cached = await getCachedProjectList(userId);
  if (cached) return res.json({ projects: cached, cached: true });

  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.description, p.owner_id, p.created_at, pm.role
         FROM projects p
         JOIN project_members pm ON pm.project_id = p.id
        WHERE pm.user_id = $1
        ORDER BY p.created_at DESC`,
      [userId],
    );
    await setCachedProjectList(userId, rows);
    return res.json({ projects: rows, cached: false });
  } catch (err) {
    console.error('[projects] list failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  const projectId = parseId(req.params.id);
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' });

  try {
    if (!(await isProjectMember(req.user!.id, projectId))) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.description, p.owner_id, p.created_at, u.name AS owner_name
         FROM projects p
         JOIN users u ON u.id = p.owner_id
        WHERE p.id = $1`,
      [projectId],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Project not found' });

    const members = await pool.query(
      `SELECT pm.user_id, u.name, u.email, pm.role
         FROM project_members pm
         JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = $1
        ORDER BY pm.role, u.name`,
      [projectId],
    );
    return res.json({ project: rows[0], members: members.rows });
  } catch (err) {
    console.error('[projects] detail failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to load project' });
  }
});

// Fetch a project's owner_id, or null if it doesn't exist. Used by owner-only routes.
async function getOwnerId(projectId: number): Promise<number | null> {
  const { rows } = await pool.query(`SELECT owner_id FROM projects WHERE id = $1`, [projectId]);
  return rows[0] ? Number(rows[0].owner_id) : null;
}

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  const projectId = parseId(req.params.id);
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' });

  const { name, description } = req.body ?? {};
  if (name === undefined && description === undefined) {
    return res.status(400).json({ error: 'Provide name and/or description to update' });
  }
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return res.status(400).json({ error: 'Project name must be a non-empty string' });
  }

  try {
    const ownerId = await getOwnerId(projectId);
    if (ownerId === null) return res.status(404).json({ error: 'Project not found' });
    if (ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the project owner can update it' });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (name !== undefined) {
      fields.push(`name = $${i++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      fields.push(`description = $${i++}`);
      values.push(typeof description === 'string' && description.trim() ? description.trim() : null);
    }
    values.push(projectId);

    const { rows } = await pool.query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, name, description, owner_id, created_at`,
      values,
    );
    // name/description appear in every member's cached list.
    await bustProjectListCache(await projectMemberIds(projectId));
    return res.json({ project: rows[0] });
  } catch (err) {
    console.error('[projects] update failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  const projectId = parseId(req.params.id);
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' });

  try {
    const ownerId = await getOwnerId(projectId);
    if (ownerId === null) return res.status(404).json({ error: 'Project not found' });
    if (ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the project owner can delete it' });
    }
    // Capture members before the cascade removes the rows, so we can bust their caches.
    const memberIds = await projectMemberIds(projectId);
    // FK ON DELETE CASCADE removes members, tasks, comments, and attachments.
    await pool.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    await bustProjectListCache(memberIds);
    return res.status(204).send();
  } catch (err) {
    console.error('[projects] delete failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST /api/projects/:id/members
router.post('/:id/members', async (req, res) => {
  const projectId = parseId(req.params.id);
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' });

  const { email, role } = req.body ?? {};
  if (typeof email !== 'string' || email.trim().length === 0) {
    return res.status(400).json({ error: 'Member email is required' });
  }
  const memberRole = typeof role === 'string' && role.trim() ? role.trim() : 'member';

  try {
    const ownerId = await getOwnerId(projectId);
    if (ownerId === null) return res.status(404).json({ error: 'Project not found' });
    if (ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the project owner can add members' });
    }

    const found = await pool.query(`SELECT id, name, email FROM users WHERE email = $1`, [
      email.toLowerCase(),
    ]);
    const user = found.rows[0];
    if (!user) return res.status(404).json({ error: 'No user with that email' });

    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)`,
      [projectId, user.id, memberRole],
    );
    await bustProjectListCache([Number(user.id)]); // the new member now sees this project
    return res
      .status(201)
      .json({ member: { user_id: user.id, name: user.name, email: user.email, role: memberRole } });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: 'User is already a member of this project' });
    }
    console.error('[projects] add member failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to add member' });
  }
});

// GET /api/projects/:id/tasks
router.get('/:id/tasks', async (req, res) => {
  const projectId = parseId(req.params.id);
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' });

  try {
    if (!(await isProjectMember(req.user!.id, projectId))) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }
    const { rows } = await pool.query(
      `SELECT t.id, t.project_id, t.title, t.description, t.status, t.due_date,
              t.assignee_id, ua.name AS assignee_name,
              t.created_by, uc.name AS created_by_name, t.created_at
         FROM tasks t
         JOIN users uc ON uc.id = t.created_by
         LEFT JOIN users ua ON ua.id = t.assignee_id
        WHERE t.project_id = $1
        ORDER BY t.created_at DESC`,
      [projectId],
    );
    return res.json({ tasks: rows });
  } catch (err) {
    console.error('[projects] list tasks failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// POST /api/projects/:id/tasks
router.post('/:id/tasks', async (req, res) => {
  const projectId = parseId(req.params.id);
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' });

  const { title, description, status, assignee_id, due_date } = req.body ?? {};
  if (typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Task title is required' });
  }
  if (status !== undefined && !isTaskStatus(status)) {
    return res.status(400).json({ error: 'status must be one of todo, in_progress, done' });
  }
  const due = parseDueDate(due_date);
  if (!due.ok) return res.status(400).json({ error: 'due_date must be YYYY-MM-DD' });

  let assigneeId: number | null = null;
  if (assignee_id !== undefined && assignee_id !== null) {
    const parsed = parseId(assignee_id);
    if (!parsed) return res.status(400).json({ error: 'Invalid assignee_id' });
    assigneeId = parsed;
  }

  try {
    if (!(await isProjectMember(req.user!.id, projectId))) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }
    // An assignee must themselves be a member of the project.
    if (assigneeId !== null && !(await isProjectMember(assigneeId, projectId))) {
      return res.status(400).json({ error: 'Assignee must be a member of the project' });
    }

    const { rows } = await pool.query(
      `INSERT INTO tasks (project_id, assignee_id, created_by, title, description, status, due_date)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::task_status, 'todo'), $7)
       RETURNING id, project_id, assignee_id, created_by, title, description, status, due_date, created_at`,
      [
        projectId,
        assigneeId,
        req.user!.id,
        title.trim(),
        typeof description === 'string' && description.trim() ? description.trim() : null,
        status ?? null,
        due.value,
      ],
    );
    const task = rows[0];
    // Notify the assignee (unless they assigned it to themselves).
    if (assigneeId !== null && assigneeId !== req.user!.id) {
      await enqueueTaskAssigned({
        taskId: Number(task.id),
        title: task.title,
        projectId,
        assigneeId,
        assignedBy: req.user!.id,
      });
    }
    return res.status(201).json({ task });
  } catch (err) {
    console.error('[projects] create task failed:', errMessage(err));
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

export default router;
