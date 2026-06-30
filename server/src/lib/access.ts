// Authorization helpers — membership and ownership checks against the DB.

import { pool } from '../config/db.js';

// Is this user a member of (or the owner of) the project?
// The owner is inserted as a project_members row on creation, so one lookup covers both.
export async function isProjectMember(userId: number, projectId: number): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId],
  );
  return rows.length > 0;
}

export interface TaskAccess {
  projectId: number;
  createdBy: number;
  ownerId: number;
  isMember: boolean;
}

// Resolve a task's project, its creator, the project owner, and whether the
// given user is a member — in one JOIN. Returns null if the task doesn't exist.
export async function getTaskAccess(userId: number, taskId: number): Promise<TaskAccess | null> {
  const { rows } = await pool.query(
    `SELECT t.project_id,
            t.created_by,
            p.owner_id,
            (pm.user_id IS NOT NULL) AS is_member
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN project_members pm
              ON pm.project_id = t.project_id AND pm.user_id = $2
      WHERE t.id = $1`,
    [taskId, userId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    projectId: Number(r.project_id),
    createdBy: Number(r.created_by),
    ownerId: Number(r.owner_id),
    isMember: r.is_member,
  };
}
