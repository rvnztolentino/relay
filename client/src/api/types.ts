// Shapes returned by the Relay API. Note: ids and BIGINT values arrive as
// strings (Postgres BIGINT serializes as a string to avoid precision loss).

export interface User {
  id: string;
  email: string;
  name: string;
  created_at?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  role?: string; // present on the list endpoint
}

export interface Member {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  assignee_id: string | null;
  assignee_name?: string | null;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user_name: string;
  body: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  filename: string;
  original_name: string;
  file_size: string;
  mime_type: string;
  created_at: string;
}
