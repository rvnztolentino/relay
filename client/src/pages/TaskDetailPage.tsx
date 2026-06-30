import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, downloadAttachment } from '../api/client';
import { getErrorMessage } from '../api/errors';
import { fmtBytes, fmtDate, statusLabel } from '../lib/format';
import { useAuth } from '../auth/AuthContext';
import type { Attachment, Comment, Task, TaskStatus } from '../api/types';

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [commentBody, setCommentBody] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const canDelete = !!user && !!task && task.created_by === user.id;

  const load = useCallback(async () => {
    try {
      const [taskRes, commentsRes, attachRes] = await Promise.all([
        api.get<{ task: Task }>(`/tasks/${id}`),
        api.get<{ comments: Comment[] }>(`/tasks/${id}/comments`),
        api.get<{ attachments: Attachment[] }>(`/tasks/${id}/attachments`),
      ]);
      setTask(taskRes.data.task);
      setComments(commentsRes.data.comments);
      setAttachments(attachRes.data.attachments);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(status: TaskStatus) {
    setError('');
    try {
      await api.put(`/tasks/${id}`, { status });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function addComment(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/tasks/${id}/comments`, { body: commentBody });
      setCommentBody('');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function uploadFile(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Choose a file first.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/tasks/${id}/attachments`, form);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function download(att: Attachment) {
    setError('');
    try {
      await downloadAttachment(att.filename, att.original_name);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteTask() {
    if (!confirm('Delete this task?')) return;
    setError('');
    try {
      const projectId = task?.project_id;
      await api.delete(`/tasks/${id}`);
      navigate(projectId ? `/projects/${projectId}` : '/');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (!task) return <p className="error">{error || 'Task not found.'}</p>;

  return (
    <div>
      <p className="crumb">
        <Link to={`/projects/${task.project_id}`}>← Project</Link>
      </p>

      <div className="row-between">
        <h2>{task.title}</h2>
        {canDelete && (
          <button type="button" className="danger" onClick={deleteTask}>
            Delete task
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}

      {task.description && <p>{task.description}</p>}

      <table className="kv">
        <tbody>
          <tr>
            <th>Status</th>
            <td>
              <select
                value={task.status}
                onChange={(e) => changeStatus(e.target.value as TaskStatus)}
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>Assignee</th>
            <td>{task.assignee_name ?? '—'}</td>
          </tr>
          <tr>
            <th>Due</th>
            <td>{fmtDate(task.due_date)}</td>
          </tr>
          <tr>
            <th>Created by</th>
            <td>
              {task.created_by_name ?? '—'} · {fmtDate(task.created_at)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="muted">Current status: {statusLabel(task.status)}</p>

      <h3>Attachments</h3>
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Size</th>
            <th>Uploaded by</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {attachments.map((a) => (
            <tr key={a.id}>
              <td>{a.original_name}</td>
              <td>{fmtBytes(a.file_size)}</td>
              <td>{a.uploaded_by_name ?? '—'}</td>
              <td>
                <button type="button" onClick={() => download(a)}>
                  Download
                </button>
              </td>
            </tr>
          ))}
          {attachments.length === 0 && (
            <tr>
              <td colSpan={4} className="muted">
                No attachments.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <form className="inline-form" onSubmit={uploadFile}>
        <input type="file" ref={fileRef} />
        <button type="submit" disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      <h3>Comments</h3>
      <ul className="comments">
        {comments.map((c) => (
          <li key={c.id}>
            <span className="comment-meta">
              {c.user_name} · {fmtDate(c.created_at)}
            </span>
            <span className="comment-body">{c.body}</span>
          </li>
        ))}
        {comments.length === 0 && <li className="muted">No comments yet.</li>}
      </ul>
      <form className="inline-form" onSubmit={addComment}>
        <input
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder="Add a comment"
          required
        />
        <button type="submit">Post</button>
      </form>
    </div>
  );
}
