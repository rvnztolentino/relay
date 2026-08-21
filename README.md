# Relay

Relay is a team task board. Members register, create projects, invite each other by email, assign and track tasks, comment on them, and attach files.

## Features

- Email/password accounts with bcrypt hashing and JWT sessions (tokens valid 7 days)
- Projects with an owner and members; owners rename, delete, and add members by email
- Tasks scoped to a project, with title, description, assignee, due date, and a `todo` / `in_progress` / `done` status
- Comments and file attachments on tasks (10 MB per file), downloadable only by project members
- Per-user project-list cache, login rate limiting, and a task-assignment notification queue, all on Redis

## Tech Stack

- Frontend: React 19 + Vite 8 (TypeScript), React Router, Axios
- Backend: Node.js 24 + Express 5 (TypeScript, ESM), raw SQL via `pg`
- Database: PostgreSQL 18
- Cache, rate limiting, and job queue: Redis 8 (ioredis)
- Auth: JWT + bcrypt
- File uploads: Multer (stored on local disk)
- Containers: Docker Compose (Postgres + Redis)

## Project Layout

- `server/` - Express API and a background worker
- `client/` - React + Vite single-page app
- `db/init/` - SQL schema, applied automatically on first Postgres boot
- `postman/` - importable Postman collection for the API, with its own README
- `docker-compose.yml` - Postgres and Redis

## Prerequisites

- Docker (OrbStack or Docker Desktop)
- Node.js 24 or newer

## Setup

1. Clone the repository and enter it.

2. Create the environment file and set real values:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set `POSTGRES_PASSWORD` and `JWT_SECRET` (see Configuration below).

3. Start the databases and wait until both report healthy:

   ```bash
   docker compose up -d
   docker compose ps
   ```

4. Install backend dependencies:

   ```bash
   cd server && npm install
   ```

5. Install frontend dependencies:

   ```bash
   cd client && npm install
   ```

## Configuration

A single `.env` file at the repo root is read by both Docker Compose and the API. Variables:

- `POSTGRES_USER` - database user (default `relay`)
- `POSTGRES_PASSWORD` - database password; set your own
- `POSTGRES_DB` - database name (default `relay`)
- `PGHOST` - database host as seen by the API (default `localhost`)
- `PGPORT` - database port (default `5432`)
- `REDIS_URL` - Redis connection URL (default `redis://localhost:6379`)
- `PORT` - API port (default `3000`)
- `JWT_SECRET` - long random string used to sign and verify JWTs; the API throws at token time if it is empty

`.env` is gitignored. Never commit real secrets; keep them only in your local `.env`.

## How to Run

Postgres and Redis run in Docker; the API, worker, and frontend run on your host. Start them in separate terminals.

Databases:

```bash
docker compose up -d
```

API (http://localhost:3000):

```bash
cd server && npm run dev
```

Background worker (optional; delivers task-assignment notifications):

```bash
cd server && npm run worker
```

Frontend (http://localhost:5173):

```bash
cd client && npm run dev
```

Check the API is wired to both databases. It returns 200 only when Postgres and Redis are both up:

```bash
curl http://localhost:3000/health
```

Production-style builds:

```bash
cd server && npm run build && npm start         # compiled API
cd client && npm run build                       # static bundle in client/dist
```

## API

`/api/auth/register` and `/api/auth/login` are public and return a JWT. Everything else requires an `Authorization: Bearer <token>` header.

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET|POST /api/projects`, `GET|PUT|DELETE /api/projects/:id`
- `POST /api/projects/:id/members` - add a member by email
- `GET|POST /api/projects/:id/tasks`
- `GET|PUT|DELETE /api/tasks/:id`
- `GET|POST /api/tasks/:id/comments`
- `GET|POST /api/tasks/:id/attachments` - upload uses multipart form field `file`
- `GET /api/attachments/:filename` - download
- `GET /health` - Postgres and Redis status

Access rules: reads and writes inside a project are limited to its members. Renaming a project, deleting it, and adding members are owner-only. A task can be deleted by its creator or the project owner.

The `postman/` folder has a collection that chains these requests together for manual testing.

## Notes

- The API runs on the host; only Postgres and Redis are containerized.
- The database schema is applied automatically the first time Postgres starts. `docker compose down` keeps the data; `docker compose down -v` wipes it, and the schema re-applies on the next start.
- Uploaded files persist on the host in `server/uploads/` (gitignored), stored under generated UUID names; the original filename is kept in the database for display.
- Redis features fail soft: if Redis is down the project list falls back to the database, the login rate limiter allows requests, and notification jobs are skipped, but the API keeps working.
- Login is rate limited to 5 failed attempts per IP per 15 minutes; a successful login clears the counter.
- The worker only logs each notification job; there is no real push service. The point is the producer/consumer split: the API enqueues and returns immediately.
- The frontend dev server proxies `/api` to the API on port 3000, so both must be running. The JWT is stored in `localStorage`.
- IDs are returned as strings because Postgres `BIGINT` is serialized as a string.
