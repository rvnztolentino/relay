# Branch Strategy and Progress

Relay is built phase-by-phase (see `vision.md`). Each remaining phase is its own branch.
Build one branch at a time; complete it, generate artifacts, then stop for review before the next.

Base branch: `main` (empty initial commit). No remotes/PRs are created automatically.

## feat/foundation
Branch status: Completed
PR status: Ready
Scope: Phase 1 (Environment) + Phase 2 (Express server). Repo scaffold, Docker Compose for
Postgres 18 + Redis 8 with persistent volumes, full SQL schema auto-applied on first boot,
root `.env`/`.env.example`, `.gitignore`, and a minimal Express 5 API exposing `GET /health`
that pings both Postgres and Redis.
Completed work: All of the above. Server boots; `/health` returns 503/degraded with DB+Redis
down (expected without Docker) and 404 handler works; `docker compose config` validates with the
PG18 volume path. Dependencies installed at exact pinned versions.
Remaining work: None for this scope. Live `db:up`/`redis:up` requires the user to start Docker
Desktop and run `docker compose up -d` (see `.claude/setup.md`).
Dependencies: None.
Can merge independently: Yes.
Resume notes: API runs on the host; only DB+Redis are containerized. Uploads (Phase 5) deferred.
`bcrypt`/`jsonwebtoken`/`multer`/`react`/`vite`/`prisma` are intentionally NOT installed yet.

## feat/auth
Branch status: Planned
PR status: Not Started
Scope: Phase 3 — register/login with bcrypt, JWT middleware, protected `GET /api/auth/me`.
Raw SQL for the `users` table.
Completed work: None.
Remaining work: All.
Dependencies: feat/foundation (schema + server + env).
Can merge independently: Yes, after foundation.
Resume notes: Add `bcrypt` 6.0.0 and `jsonwebtoken` 9.0.3 (re-verify latest at the time). bcrypt
is a native module — macOS needs Xcode Command Line Tools. `JWT_SECRET` already stubbed in `.env`.

## feat/core-crud
Branch status: Planned
PR status: Not Started
Scope: Phase 4 — projects, tasks, comments CRUD with authorization (owner-only deletes), JOINs.
Completed work: None.
Remaining work: All.
Dependencies: feat/auth.
Can merge independently: Yes, after auth.
Resume notes: Practice raw SQL JOINs in DBeaver before wiring routes.

## feat/file-uploads
Branch status: Planned
PR status: Not Started
Scope: Phase 5 — Multer config, `attachments` table wiring, authenticated file serving, persistence.
Completed work: None.
Remaining work: All.
Dependencies: feat/core-crud.
Can merge independently: Yes, after core-crud.
Resume notes: Add `multer` 2.2.0 (2.x is the secure major). Revisit whether uploads live on a local
folder or a Docker volume (the host-API decision from foundation).

## feat/redis
Branch status: Planned
PR status: Not Started
Scope: Phase 6 — project-list cache (60s TTL, bust on write), login rate limiter (5/IP/15min),
task-assignment notification queue + background worker.
Completed work: None.
Remaining work: All.
Dependencies: feat/core-crud (and feat/auth for the rate limiter).
Can merge independently: Yes, after core-crud.
Resume notes: ioredis client already exists at `server/src/config/redis.js`.

## feat/frontend
Branch status: Planned
PR status: Not Started
Scope: Phase 7 — React + Vite app in `client/`. Auth context, protected routes, Axios API layer,
2000s-intranet UI (single `styles.css`, no Tailwind).
Completed work: None.
Remaining work: All.
Dependencies: feat/auth + feat/core-crud (working API).
Can merge independently: Yes, after the API is usable.
Resume notes: Add `react` 19.2.7 + `vite` 8.1.0 (re-verify latest). CORS is already enabled on the API.
