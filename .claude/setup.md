# Relay — Setup Guide (Foundation)

Get Postgres + Redis running in Docker and the Express API running on your machine, then confirm
everything is wired with one `curl`. About 10 minutes the first time.

How it runs: **Postgres and Redis live in Docker. The API runs directly on your host (Node).**

---

## 1. Install the prerequisites

| Tool | Why | Get it |
|---|---|---|
| Docker Desktop | Runs Postgres + Redis | https://www.docker.com/products/docker-desktop |
| Node.js 24 LTS | Runs the API | https://nodejs.org (or `nvm install 24`) |
| DBeaver | Look at the database | https://dbeaver.io/download |

Check the versions:

```bash
docker --version      # 28.x
node -v               # v24.x
```

Make sure **Docker Desktop is actually running** (whale icon in the menu bar) before the next step.

---

## 2. Create your .env

From the repo root:

```bash
cp .env.example .env
```

Open `.env` and set two values:

- `POSTGRES_PASSWORD` — any password you like (used by both Postgres and the API).
- `JWT_SECRET` — a long random string (not used until the auth branch, but set it now).

This one file at the repo root is read by **both** Docker Compose and the API.

---

## 3. Start the databases

```bash
docker compose up -d
```

Wait until both containers report `healthy`:

```bash
docker compose ps
```

You should see `relay-postgres` and `relay-redis` both `Up (healthy)`. The database schema is applied
automatically the **first** time Postgres starts (from `db/init/01_schema.sql`).

---

## 4. Look at the database in DBeaver

New connection → PostgreSQL, then:

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `relay` (your `POSTGRES_DB`) |
| Username | `relay` (your `POSTGRES_USER`) |
| Password | the `POSTGRES_PASSWORD` from `.env` |

Connect and expand **Databases → relay → Schemas → public → Tables**. You should see six tables —
`users`, `projects`, `project_members`, `tasks`, `comments`, `attachments` — plus the `task_status`
enum under **Data Types**.

---

## 5. Run the API

```bash
cd server
npm install      # first time only
npm run dev      # starts with nodemon (auto-restart on save)
```

You should see: `Relay API listening on http://localhost:3000`.

---

## 6. Verify everything is connected

In another terminal:

```bash
curl http://localhost:3000/health
```

Expected (HTTP 200):

```json
{"status":"ok","db":"up","redis":"up","uptime":3,"timestamp":"..."}
```

If `db` or `redis` shows `"down"` (and the response is HTTP 503 / `"degraded"`), the API can't reach
that container — check Step 3.

---

## 7. Stop and reset

```bash
docker compose down       # stop containers, KEEP the data
docker compose down -v    # stop AND wipe the data (schema re-applies on next `up`)
```

Stop the API with `Ctrl+C`.

---

## Troubleshooting

- **Port already in use (5432 / 6379):** something else is using the port. Stop it, or change the
  host side of the mapping in `docker-compose.yml` (e.g. `"5433:5432"`) and update `PGPORT` in `.env`.
- **`/health` shows `db: down` but containers are `healthy`:** confirm `PGHOST=localhost` and
  `PGPORT=5432` in `.env`, and that the API was restarted after editing `.env`.
- **Tables are missing in DBeaver:** the schema only auto-runs on a *fresh* volume. Either
  `docker compose down -v && docker compose up -d`, or open `db/init/01_schema.sql` in DBeaver and run it.
- **Postgres 18 data didn't persist after a restart:** the v18 image stores data under
  `/var/lib/postgresql` (not the old `/var/lib/postgresql/data`). The provided `docker-compose.yml`
  already mounts the volume at the correct path — don't change it back.
- **Docker Desktop not running:** `docker compose up` fails with a daemon connection error. Start
  Docker Desktop and wait for the whale icon to go steady, then retry.
