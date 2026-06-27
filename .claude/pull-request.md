## Commit Name
feat: foundation — Docker databases, schema, and Express health endpoint

## Summary
Starts the Relay project with the environment and a minimal API. PostgreSQL 18 and Redis 8 run in Docker Compose with persistent volumes, the full database schema is applied automatically on first boot, and an Express 5 server exposes a GET /health endpoint that pings both Postgres and Redis. The API runs on the host; only the databases are containerized. This covers Phase 1 and Phase 2 of vision.md.

## Changes
Added docker-compose.yml for Postgres 18 (postgres:18-alpine) and Redis 8 (redis:8-alpine) with named volumes and healthchecks. The Postgres volume mounts at /var/lib/postgresql to match the version-specific PGDATA path used by the v18 image.
Added db/init/01_schema.sql with the six tables (users, projects, project_members, tasks, comments, attachments), the task_status enum, foreign keys, and indexes. It is auto-applied via docker-entrypoint-initdb.d on first boot.
Added the Express server under server/ as ESM: src/index.js (app, cors, json, 404 handler), src/config/env.js (loads the root .env and exposes config), src/config/db.js (pg Pool), src/config/redis.js (ioredis client), and src/routes/health.js (GET /health).
Added a single root .env.example, a .gitignore, and a README.md that points to .claude/setup.md.
Pinned exact dependency versions: express 5.2.1, pg 8.22.0, ioredis 5.11.1, dotenv 17.4.2, cors 2.8.6, and nodemon 3.1.14 (dev).

## Testing
npm install in server/ completed with no errors (117 packages).
The server boots and logs the listening address. GET /health returns 503 with db down and redis down while Docker is stopped, and GET /nope returns 404, confirming routing and config wiring. dotenv loaded 8 variables from the root .env.
docker compose config validates and substitutes env values, with the pgdata volume targeting /var/lib/postgresql.
The live db up and redis up path, the six tables in DBeaver, and volume persistence are verified after running docker compose up -d, per .claude/tests.md.

## Impact and risk
Low risk. This is the initial scaffold with no existing behavior to break. The API runs on the host and only reads local databases. No remotes, pushes, or pull requests are created automatically. Secrets stay in the gitignored .env. bcrypt, jsonwebtoken, multer, react, vite, and prisma are intentionally not installed yet and arrive in later branches.

## Screenshots (if UI, placeholder for now)
N/A — no UI in this branch.
