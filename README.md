# Relay

A team task board built from scratch — projects, tasks, comments, file uploads, and progress
tracking. No Supabase, no Firebase: auth, caching, queues, and relational data modeling are all
built by hand. See [`.claude/vision.md`](.claude/vision.md) for the full learning plan.

## Stack

React + Vite · Node.js + Express 5 · PostgreSQL 18 · Redis 8 · Docker Compose · raw SQL (`pg`) → Prisma later

## Quick start

Postgres and Redis run in Docker; the API runs on your host.

```bash
cp .env.example .env        # then edit POSTGRES_PASSWORD / JWT_SECRET
docker compose up -d        # start Postgres + Redis
cd server && npm install && npm run dev
curl http://localhost:3000/health
```

Full, step-by-step setup (prerequisites, DBeaver, troubleshooting): **[`.claude/setup.md`](.claude/setup.md)**.

## Layout

```
docker-compose.yml     Postgres 18 + Redis 8 (local databases)
db/init/               schema applied on first Postgres boot
server/                Express API (host)
```

## Progress

Built phase-by-phase on feature branches — see [`.claude/branch.md`](.claude/branch.md).
Current: **foundation** (environment + `GET /health`).
