# Relay — Backend Learning Plan

> A team task board built from scratch. No Supabase. No Firebase. Every piece built by hand.

---

## What Is Relay?

A team task board where members create projects, assign tasks, upload files, leave comments, and track progress. Small enough to finish, complex enough to cover auth, file uploads, caching, queues, and relational data modeling.

---

## Tech Stack

|Layer|Technology|
|---|---|
|Frontend|React + Vite|
|Backend|Node.js + Express.js|
|Database|PostgreSQL|
|Cache / Queue|Redis|
|File Storage|Docker Volume|
|ORM / Query|`pg` (raw SQL first), then Prisma|
|Auth|JWT + bcrypt|
|File Uploads|Multer|
|Containers|Docker Compose|
|DB Viewer|DBeaver or pgAdmin|

---

## Architecture

```
React + Vite (localhost:5173)
    │
    ▼
Node.js + Express.js (localhost:3000)
    ├── Auth, Routes, Controllers, Middleware
    ├── pg client → PostgreSQL
    └── ioredis client → Redis

PostgreSQL / Redis / Docker Volume all run inside Docker Compose.
DBeaver connects to PostgreSQL from the host machine.
```

---

## Database Tables

- `users` — id, email, password_hash, name, created_at
- `projects` — id, name, description, owner_id, created_at
- `project_members` — project_id, user_id, role
- `tasks` — id, project_id, assignee_id, created_by, title, description, status (enum), due_date
- `comments` — id, task_id, user_id, body
- `attachments` — id, task_id, uploaded_by, filename, original_name, file_size, mime_type

---

## API Routes

|Method|Route|Auth|
|---|---|---|
|POST|`/api/auth/register`|No|
|POST|`/api/auth/login`|No|
|GET|`/api/auth/me`|Yes|
|GET/POST|`/api/projects`|Yes|
|GET/PUT/DELETE|`/api/projects/:id`|Yes|
|POST|`/api/projects/:id/members`|Yes|
|GET/POST|`/api/projects/:id/tasks`|Yes|
|GET/PUT/DELETE|`/api/tasks/:id`|Yes|
|GET/POST|`/api/tasks/:id/comments`|Yes|
|POST|`/api/tasks/:id/attachments`|Yes|
|GET|`/api/attachments/:filename`|Yes|

---

## Redis Usage

- **Cache** — project list per user, 60s TTL, bust on write
- **Rate limiter** — max 5 login attempts per IP per 15 minutes
- **Queue** — push notification jobs on task assignment, consume with a background worker

---

## Learning Phases

### Phase 1 — Environment

Get Docker Compose running, PostgreSQL connected in DBeaver, schema applied.

### Phase 2 — Express Server

Basic server with a `GET /health` endpoint. Test with Postman or Bruno.

### Phase 3 — Auth

Register, login, JWT middleware, protected `/me` endpoint. Write raw SQL for users table.

### Phase 4 — Core CRUD

Projects, tasks, comments. Authorization checks (owner-only deletes). Practice JOIN queries in DBeaver.

### Phase 5 — File Uploads

Multer config, attachments table, authenticated file serving, Docker volume persistence.

### Phase 6 — Redis

Caching, rate limiting, queue producer + background worker.

### Phase 7 — Frontend

React + Vite app. Auth context, protected routes, Axios API layer. 2000s-style UI — flat colors, system fonts, plain tables, no animations.

---

## Frontend Design Direction

2000s intranet style. Think early Basecamp or phpBB.

- System fonts (Arial/Verdana), 13px
- `#eeeeee` background, `#336699` header bar
- Flat buttons, 1px borders, no shadows or gradients
- One plain `styles.css` file — no Tailwind, no CSS modules
- Tables with alternating rows, plain form inputs

---

## Key Habits

- Write raw SQL by hand before using any ORM method
- Open DBeaver after every DB operation to see the data change
- Test one endpoint at a time before moving on
- All secrets in `.env`, never hardcoded
- Commit after each working phase