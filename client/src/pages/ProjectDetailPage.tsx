import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { getErrorMessage } from '../api/errors';
import { fmtDate, statusLabel } from '../lib/format';
import { useAuth } from '../auth/AuthContext';
import type { Member, Project, Task, TaskStatus } from '../api/types';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // add-member form
  const [memberEmail, setMemberEmail] = useState('');
  // create-task form
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState('');

  const isOwner = !!user && !!project && project.owner_id === user.id;

  const load = useCallback(async () => {
    try {
      const [detail, taskList] = await Promise.all([
        api.get<{ project: Project; members: Member[] }>(`/projects/${id}`),
        api.get<{ tasks: Task[] }>(`/projects/${id}/tasks`),
      ]);
      setProject(detail.data.project);
      setMembers(detail.data.members);
      setTasks(taskList.data.tasks);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addMember(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/projects/${id}/members`, { email: memberEmail });
      setMemberEmail('');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function createTask(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/projects/${id}/tasks`, {
        title,
        status,
        assignee_id: assigneeId || undefined,
        due_date: dueDate || undefined,
      });
      setTitle('');
      setAssigneeId('');
      setStatus('todo');
      setDueDate('');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteProject() {
    if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    setError('');
    try {
      await api.delete(`/projects/${id}`);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!project) return <p className="error">{error || 'Project not found.'}</p>;

  return (
    <div>
      <p className="crumb">
        <Link to="/">← Projects</Link>
      </p>

      <div className="row-between">
        <h2>{project.name}</h2>
        {isOwner && (
          <button type="button" className="danger" onClick={deleteProject}>
            Delete project
          </button>
        )}
      </div>
      {project.description && <p>{project.description}</p>}
      {error && <p className="error">{error}</p>}

      <h3>Members</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.user_id}>
              <td>{m.name}</td>
              <td>{m.email}</td>
              <td>{m.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {isOwner && (
        <form className="inline-form" onSubmit={addMember}>
          <input
            type="email"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            placeholder="Add member by email"
            required
          />
          <button type="submit">Add member</button>
        </form>
      )}

      <h3>Tasks</h3>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Assignee</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>
                <Link to={`/tasks/${t.id}`}>{t.title}</Link>
              </td>
              <td>{statusLabel(t.status)}</td>
              <td>{t.assignee_name ?? '—'}</td>
              <td>{fmtDate(t.due_date)}</td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No tasks yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h3>New task</h3>
      <form className="stack-form" onSubmit={createTask}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Assignee
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label>
          Due date
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <button type="submit">Create task</button>
      </form>
    </div>
  );
}
