import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { getErrorMessage } from '../api/errors';
import { fmtDate } from '../lib/format';
import type { Project } from '../api/types';

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const { data } = await api.get<{ projects: Project[] }>('/projects');
      setProjects(data.projects);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProject(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/projects', { name });
      setName('');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <h2>Projects</h2>

      <form className="inline-form" onSubmit={createProject}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project name"
          required
        />
        <button type="submit">Create project</button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Your role</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/projects/${p.id}`}>{p.name}</Link>
                </td>
                <td>{p.role ?? '—'}</td>
                <td>{fmtDate(p.created_at)}</td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  No projects yet — create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
