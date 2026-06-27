# Manual Tests — Foundation

Run after `docker compose up -d` and `npm run dev` (see `.claude/setup.md`).

## Already verified (without Docker)

| # | Check | Result |
|---|---|---|
| 1 | `npm install` in `server/` | 117 packages, no errors |
| 2 | Server boots | logs `Relay API listening on http://localhost:3000` |
| 3 | `GET /health` with DB+Redis down | `503` `{"status":"degraded","db":"down","redis":"down",...}` |
| 4 | `GET /nope` | `404` `{"error":"Not found"}` |
| 5 | `.env` loading | dotenv injected 8 vars from root `.env` |
| 6 | `docker compose config` | valid; `pgdata` → `/var/lib/postgresql` (PG18), env substituted |

## To verify with Docker running

| # | Step | Expected |
|---|---|---|
| 7 | `docker compose up -d` then `docker compose ps` | `relay-postgres` and `relay-redis` both `Up (healthy)` |
| 8 | `GET /health` | `200` `{"status":"ok","db":"up","redis":"up",...}` |
| 9 | DBeaver → relay → public → Tables | 6 tables: `users`, `projects`, `project_members`, `tasks`, `comments`, `attachments` |
| 10 | DBeaver → Data Types | `task_status` enum (`todo`, `in_progress`, `done`) |
| 11 | `docker compose down` then `up -d`, re-check tables | data persists (volume mounted correctly) |
| 12 | Stop Redis only (`docker compose stop redis`), `GET /health` | `503`, `db:up`, `redis:down` |
